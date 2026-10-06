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
  const [{ data: profile }, { data: credits }] = await Promise.all([
    supabase.from('profiles').select('full_name, role, country, timezone').eq('id', authUser.id).single(),
    supabase.rpc('my_credits'),
  ]);
  const name = profile?.full_name || authUser.email;
  const role = profile?.role ?? 'student';
  return {
    id: authUser.id,
    email: authUser.email,
    name,
    initials: initialsOf(name),
    role,
    color: role === 'admin' ? '#C07BA8' : '#D4608A',
    country: profile?.country ?? null,
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
    showToast(`${getGreeting()}${first ? ', ' + first : ''}! 🌸`, 'success');
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
      showToast('Check your email to confirm your account, then sign in. 🌸', 'success');
      return { ok: true, needsConfirmation: true };
    }
    // Save the student's timezone so lesson times display correctly everywhere.
    await supabase.from('profiles').update({ timezone: browserTimezone() }).eq('id', data.user.id);
    setCurrentUser(await loadCurrentUser(data.user));
    showToast('Account created! Buy your first credits to get started. 🌸', 'success');
    return { ok: true, needsConfirmation: false };
  }, [showToast]);

  const setTimezone = useCallback(async (timezone) => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({ timezone }).eq('id', currentUser.id);
    if (error) { showToast('Could not save your time zone.', 'error'); return; }
    setCurrentUser(u => ({ ...u, timezone }));
  }, [currentUser, showToast]);

  const value = useMemo(() => ({
    currentUser, authLoading, login, logout, register, refreshCredits, setTimezone,
    toast, showToast,
    modal, openModal, closeModal,
  }), [currentUser, authLoading, login, logout, register, refreshCredits, setTimezone, toast, showToast, modal, openModal, closeModal]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
