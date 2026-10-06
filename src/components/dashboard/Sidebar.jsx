import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

const STUDENT_NAV = [
  { view: 'home',     icon: '🏠', label: 'Dashboard' },
  { view: 'booking',  icon: '📅', label: 'Book a Lesson' },
  { view: 'lessons',  icon: '🎓', label: 'My Lessons' },
  { view: 'resources',icon: '📁', label: 'Resources' },
  { view: 'credits',  icon: '🎟', label: 'Credits & Billing' },
  { view: 'progress', icon: '📊', label: 'My Progress' },
];

const ADMIN_NAV = [
  { view: 'admin-home',      icon: '🏠', label: 'Dashboard',   section: 'Overview' },
  { view: 'admin-students',  icon: '👥', label: 'Students' },
  { view: 'admin-bookings',  icon: '📅', label: 'Bookings' },
  { view: 'admin-lessons',   icon: '🎓', label: 'Lessons',     section: 'Content' },
  { view: 'admin-resources', icon: '📁', label: 'Resources' },
  { view: 'admin-billing',   icon: '💰', label: 'Invoices',    section: 'Finance' },
  { view: 'admin-settings',  icon: '⚙️', label: 'Hours & leave' },
];

export default function Sidebar({ activeView, onSwitch, open, onClose }) {
  const { currentUser, logout, showToast } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';
  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {/* Overlay (mobile) */}
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌸</div>
          <div>
            <div className="sidebar-logo-name">Blooming Bilingual</div>
            <div className="sidebar-logo-sub">{isAdmin ? 'Tutor Portal' : 'Student Portal'}</div>
          </div>
        </div>

        {/* Credit widget (students only) */}
        {!isAdmin && (
          <div
            className="sidebar-credit-widget"
            onClick={() => { onSwitch('credits'); onClose(); }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .6 }}>🎟 My Credits</span>
              <span style={{ fontSize: '.65rem', opacity: .75, textDecoration: 'underline' }}>Buy more</span>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.7rem', fontWeight: 700, lineHeight: 1 }}>
              {currentUser?.credits ?? 0}
            </div>
            <div style={{ fontSize: '.66rem', opacity: .6, margin: '1px 0 8px' }}>credits · 45 min each</div>
            <div style={{ height: 4, borderRadius: 10, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(((currentUser?.credits || 0) / 8) * 100, 100)}%`, background: '#E8829F', borderRadius: 10 }} />
            </div>
          </div>
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
              >
                <span className="sl-icon">{item.icon}</span>
                {item.label}
              </button>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => showToast('Profile settings coming soon.', 'info')}>
            <div className="sidebar-user-avatar" style={{ background: currentUser?.color }}>
              {currentUser?.initials}
            </div>
            <div>
              <div className="sidebar-user-name">{currentUser?.name}</div>
              <div className="sidebar-user-role">{isAdmin ? 'Tutor · Admin' : 'Student'}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--ink-muted)' }}>⋯</span>
          </div>
          <button className="sidebar-link" onClick={handleLogout} style={{ color: 'var(--red)', marginTop: 4 }}>
            <span className="sl-icon">🚪</span> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
