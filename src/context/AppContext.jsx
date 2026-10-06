import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { USERS, getGreeting } from '../data/constants';

const AppContext = createContext(null);
const STORAGE_KEY = 'bb_user';

function loadUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(loadUser);
  const [toast, setToast] = useState({ msg: '', type: '', visible: false });
  const [modal, setModal] = useState({ open: false, title: '', content: null });
  const toastTimer = useRef(null);

  useEffect(() => {
    try {
      if (currentUser) { const { pass, ...safe } = currentUser; localStorage.setItem(STORAGE_KEY, JSON.stringify(safe)); }
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* storage unavailable */ }
  }, [currentUser]);

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

  // ── Auth ──
  const login = useCallback((email, pass) => {
    const user = USERS.find(u => u.email === email.trim().toLowerCase() && u.pass === pass);
    if (!user) {
      const emailExists = USERS.find(u => u.email === email.trim().toLowerCase());
      showToast(emailExists ? 'Incorrect password.' : `No account found for ${email}`, 'error');
      return false;
    }
    setCurrentUser({ ...user }); // copy so credits can be mutated
    const greeting = getGreeting();
    showToast(`${greeting}, ${user.name.split(' ')[0]}! 🌸`, 'success');
    return true;
  }, [showToast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    showToast('You have been signed out.', 'info');
  }, [showToast]);

  const register = useCallback((first, last, email, pass) => {
    email = email.trim().toLowerCase();
    if (USERS.some(u => u.email === email)) {
      showToast('An account with that email already exists.', 'error');
      return null;
    }
    const user = {
      email, role: 'student',
      name: `${first} ${last}`,
      initials: (first[0] + (last[0] || '')).toUpperCase(),
      color: '#D4608A',
      credits: 0,
    };
    setCurrentUser(user);
    showToast('Account created! Buy your first credits to get started. 🌸', 'success');
    return user;
  }, [showToast]);

  const addCredits = useCallback((n) => {
    setCurrentUser(u => u ? { ...u, credits: (u.credits || 0) + n } : u);
  }, []);

  const value = useMemo(() => ({
    currentUser, login, logout, register, addCredits,
    toast, showToast,
    modal, openModal, closeModal,
  }), [currentUser, login, logout, register, addCredits, toast, showToast, modal, openModal, closeModal]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
