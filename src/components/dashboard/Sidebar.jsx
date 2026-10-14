import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Icon from '../ui/Icon';
import { BrandMark } from '../ui/Brand';
import { BRAND } from '../../data/brand';

export const STUDENT_NAV = [
  { view: 'home',      icon: 'home',     label: 'Dashboard' },
  { view: 'booking',   icon: 'calendar', label: 'Book a Lesson' },
  { view: 'lessons',   icon: 'lessons',  label: 'My Lessons' },
  { view: 'chat',      icon: 'chat',     label: 'Chat with Neeliën' },
  { view: 'resources', icon: 'files',    label: 'Files' },
  { view: 'credits',   icon: 'credits',  label: 'Credits & Billing' },
  { view: 'progress',  icon: 'progress', label: 'My Progress' },
];

const ADMIN_NAV = [
  { view: 'admin-home',      icon: 'home',     label: 'Dashboard',    section: 'Overview' },
  { view: 'admin-students',  icon: 'students', label: 'Students' },
  { view: 'admin-bookings',  icon: 'calendar', label: 'Bookings' },
  { view: 'admin-messages',  icon: 'chat',     label: 'Messages' },
  { view: 'admin-enquiries', icon: 'mail',     label: 'Enquiries' },
  { view: 'admin-lessons',   icon: 'lessons',  label: 'Lessons',      section: 'Content' },
  { view: 'admin-resources', icon: 'files',    label: 'Student files' },
  { view: 'admin-billing',   icon: 'money',    label: 'Invoices',     section: 'Finance' },
  { view: 'admin-settings',  icon: 'clock',    label: 'Hours & leave' },
];

export default function Sidebar({ activeView, onSwitch, open, onClose }) {
  const { currentUser, logout, chatUnread } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';
  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const [newMessages, setNewMessages] = useState(0);

  // Tutor only: count unread contact-form messages (refreshes when the inbox changes and when the tab is revisited).
  useEffect(() => {
    if (!isAdmin) return undefined;
    const count = () => supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('is_read', false)
      .then(({ count: n, error }) => { if (!error) setNewMessages(n ?? 0); });
    count();
    window.addEventListener('messages-changed', count);
    window.addEventListener('focus', count);
    return () => { window.removeEventListener('messages-changed', count); window.removeEventListener('focus', count); };
  }, [isAdmin, activeView]);

  // Unread counts shown next to menu items.
  const badgeFor = (view) => (view === 'admin-enquiries' ? newMessages : view === 'admin-messages' || view === 'chat' ? chatUnread : 0);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {/* Overlay (mobile) */}
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Dashboard navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <BrandMark size={36} tone="light" />
          <div>
            <div className="sidebar-logo-name">{BRAND.short}</div>
            <div className="sidebar-logo-sub">{isAdmin ? 'Tutor Portal' : 'Student Portal'}</div>
          </div>
        </div>

        {/* Credit widget (students only) */}
        {!isAdmin && (
          <button
            className="sidebar-credit-widget"
            onClick={() => { onSwitch('credits'); onClose(); }}
            aria-label={`${currentUser?.credits ?? 0} credits. Open Credits & Billing`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .85 }}><Icon name="credits" weight="fill" /> My Credits</span>
              <span style={{ fontSize: '.75rem', opacity: .9, textDecoration: 'underline', textUnderlineOffset: 3 }}>Buy more</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {currentUser?.credits ?? 0}
            </div>
            <div style={{ fontSize: '.78rem', opacity: .8, margin: '2px 0 10px' }}>credits · 45 min each</div>
            <div style={{ height: 4, borderRadius: 10, background: 'rgba(255,255,255,.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(((currentUser?.credits || 0) / 8) * 100, 100)}%`, background: 'var(--blush)', borderRadius: 10 }} />
            </div>
          </button>
        )}

        {/* Nav links */}
        <nav className="sidebar-nav">
          {nav.map(item => (
            <div key={item.view}>
              {item.section && (
                <div className="sidebar-section-label" style={{ marginTop: 8 }}>{item.section}</div>
              )}
              <button
                className={`sidebar-link ${activeView === item.view ? 'active' : ''}`}
                onClick={() => { onSwitch(item.view); onClose(); }}
                aria-current={activeView === item.view ? 'page' : undefined}
              >
                <span className="sl-icon"><Icon name={item.icon} weight={activeView === item.view ? 'fill' : 'regular'} /></span>
                {item.label}
                {badgeFor(item.view) > 0 && <span className="nav-badge" aria-label={`${badgeFor(item.view)} unread`}>{badgeFor(item.view)}</span>}
              </button>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: currentUser?.color }}>
              {currentUser?.initials}
            </div>
            <div>
              <div className="sidebar-user-name">{currentUser?.name}</div>
              <div className="sidebar-user-role">{isAdmin ? 'Tutor · Admin' : 'Student'}</div>
            </div>
          </div>
          <button className="sidebar-link sidebar-signout" onClick={handleLogout}>
            <span className="sl-icon"><Icon name="signout" /></span> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
