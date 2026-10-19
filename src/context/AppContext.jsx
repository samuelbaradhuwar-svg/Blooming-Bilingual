import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getGreeting } from '../data/constants';

const AppContext = createContext(null);

const browserTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

// Combine the auth user, their profile row and their credit balance into the shape the UI uses.
async function loadCurrentUser(authUser) {
  let [{ data: profile, error }, { data: credits }] = await Promise.all([
    supabase.from('profiles').select('full_name, role, country, timezone, english_level, next_lesson_focus').eq('id', authUser.id).single(),
    supabase.rpc('my_credits'),
  ]);
  if (error) {
    // The newer columns may not exist yet (database script not run): never lose the user's role over that.
    ({ data: profile } = await supabase.from('profiles').select('full_name, role, country, timezone').eq('id', authUser.id).single());
  }
  const name = profile?.full_name || authUser.email;
  const role = profile?.role ?? 'student';
  return {
    id: authUser.id,
    email: authUser.email,
    name,
    initials: initialsOf(name),
    role,
    color: role === 'admin' ? '#5E1646' : '#7A1F5C',
    country: profile?.country ?? null,
    englishLevel: profile?.english_level ?? null,
    nextLessonFocus: profile?.next_lesson_focus ?? null,
    timezone: profile?.timezone && profile.timezone !== 'UTC' ? profile.timezone : browserTimezone(),
    credits: credits ?? 0,
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '', visible: false });
  const [modal, setModal] = useState({ open: false, title: '', content: null });
  const toastTimer = useRef(null);
  const roleCheck = useRef(false);   // true while a role-restricted sign-in is being verified
  const [chatUnread, setChatUnread] = useState(0);   // unread chat messages for whoever is signed in

  // ── Toast ──
  const showToast = useCallback((msg, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  }, []);

  // ── Modal ──
  const openModal = useCallback((title, content) => {
    setModal({ open: true, title, content });
  }, []);
  const closeModal = useCallback(() => {
    setModal(m => ({ ...m, open: false }));
  }, []);

  // ── Auth: follow the Supabase session ──
  useEffect(() => {
    let active = true;
    const apply = async (session) => {
      if (roleCheck.current) return;
      if (!session?.user) { if (active) { setCurrentUser(null); setAuthLoading(false); } return; }
      try {
        const user = await loadCurrentUser(session.user);
        if (active) setCurrentUser(user);
      } catch {
        if (active) setCurrentUser(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // defer: Supabase forbids awaiting other Supabase calls inside this callback
      setTimeout(() => apply(session), 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const refreshCredits = useCallback(async () => {
    const { data } = await supabase.rpc('my_credits');
    if (typeof data === 'number') setCurrentUser(u => (u ? { ...u, credits: data } : u));
  }, []);

  // ── Chat notifications: an unread count that updates live, with a slow background refresh as a safety net ──
  const refreshChatUnread = useCallback(async () => {
    const { data, error } = await supabase.rpc('chat_unread_count');
    if (!error && typeof data === 'number') setChatUnread(data);
  }, []);

  useEffect(() => {
    if (!currentUser) { setChatUnread(0); return undefined; }
    const me = currentUser.id;
    const isTutor = currentUser.role === 'admin';
    refreshChatUnread();
    const channel = supabase.channel(`chat-inbox-${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        if (payload.new?.sender_id === me) return;
        refreshChatUnread();
        // Tell them, unless they are already looking at the chat.
        const onChat = /\/dashboard\/(chat|admin-messages)/.test(window.location.pathname) && document.visibilityState === 'visible';
        if (!onChat) showToast(isTutor ? 'You have a new message from a student.' : 'Neeliën replied to your chat.', 'info');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, refreshChatUnread)
      .subscribe();
    const poll = setInterval(refreshChatUnread, 45000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshChatUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(poll); document.removeEventListener('visibilitychange', onVisible); supabase.removeChannel(channel); };
  }, [currentUser?.id, currentUser?.role, refreshChatUnread, showToast]);

  // Show the unread count in the browser tab, so a waiting message is noticed from another tab.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = chatUnread > 0 ? `(${chatUnread}) ${base}` : base;
  }, [chatUnread]);

  // requireRole: optionally refuse accounts without that role (used by the tutor login page).
  const login = useCallback(async (email, pass, requireRole) => {
    roleCheck.current = !!requireRole;
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    if (error) {
      roleCheck.current = false;
      showToast(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message, 'error');
      return false;
    }
    // Load the profile now so the dashboard route is ready the moment we navigate.
    const user = await loadCurrentUser(data.user);
    if (requireRole && user.role !== requireRole) {
      await supabase.auth.signOut();
      roleCheck.current = false;
      showToast('That account is not a tutor account. Students sign in from the Student Login page.', 'error');
      return null;
    }
    roleCheck.current = false;
    setCurrentUser(user);
    const first = (data.user.user_metadata?.full_name || '').split(' ')[0];
    showToast(`${getGreeting()}${first ? ', ' + first : ''}!`, 'success');
    return user;
  }, [showToast]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    showToast('You have been signed out.', 'info');
  }, [showToast]);

  const register = useCallback(async (first, last, email, pass, country) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pass,
      options: { data: { full_name: `${first} ${last}`.trim(), country: country || null } },
    });
    if (error) { showToast(error.message, 'error'); return { ok: false }; }
    if (!data.session) {
      // Email confirmation is on: the account exists but needs verifying first.
      showToast('Check your email to confirm your account, then sign in.', 'success');
      return { ok: true, needsConfirmation: true };
    }
    // Save the student's timezone so lesson times display correctly everywhere.
    await supabase.from('profiles').update({ timezone: browserTimezone() }).eq('id', data.user.id);
    setCurrentUser(await loadCurrentUser(data.user));
    showToast('Account created! Buy your first credits to get started.', 'success');
    return { ok: true, needsConfirmation: false };
  }, [showToast]);

  const setTimezone = useCallback(async (timezone) => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({ timezone }).eq('id', currentUser.id);
    if (error) { showToast('Could not save your time zone.', 'error'); return; }
    setCurrentUser(u => ({ ...u, timezone }));
  }, [currentUser, showToast]);

  // Save the details a person may edit themselves (their name, country and time zone). Role, level and email are protected in the database.
  const updateProfile = useCallback(async ({ full_name, country, timezone }) => {
    if (!currentUser) return { ok: false };
    const patch = { full_name: (full_name || '').trim(), country: country || null, timezone };
    const { error } = await supabase.from('profiles').update(patch).eq('id', currentUser.id);
    if (error) { showToast('Could not save your profile. Please try again.', 'error'); return { ok: false }; }
    const name = patch.full_name || currentUser.email;
    setCurrentUser(u => ({ ...u, name, initials: initialsOf(name), country: patch.country, timezone }));
    return { ok: true };
  }, [currentUser, showToast]);

  const value = useMemo(() => ({
    currentUser, authLoading, login, logout, register, refreshCredits, setTimezone, updateProfile, chatUnread, refreshChatUnread,
    toast, showToast,
    modal, openModal, closeModal,
  }), [currentUser, authLoading, login, logout, register, refreshCredits, setTimezone, updateProfile, chatUnread, refreshChatUnread, toast, showToast, modal, openModal, closeModal]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
