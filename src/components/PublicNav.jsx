import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function PublicNav() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);
  const go = (path) => { navigate(path); close(); };

  return (
    <>
      <nav className="public-nav">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <div className="nav-brand-icon">🌸</div>
          <div className="nav-brand-name">The Blooming Bilingual</div>
        </div>
        <div className="nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(currentUser ? '/dashboard' : '/login')}>{currentUser ? 'My Dashboard' : 'Student Login'}</button>
          <button
            className={`burger-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Overlay */}
      <div className={`menu-overlay ${menuOpen ? 'open' : ''}`} onClick={close} />

      {/* Drawer */}
      <div className={`menu-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="menu-drawer-header">
          <div className="nav-brand" onClick={() => go('/')}>
            <div className="nav-brand-icon">🌸</div>
            <div className="nav-brand-name">The Blooming Bilingual</div>
          </div>
          <button className="menu-close-btn" onClick={close} aria-label="Close menu">✕</button>
        </div>

        <nav className="menu-nav">
          {[
            { icon: '🌸', label: 'About Neeliën',      sub: 'Meet your tutor, qualifications & intro video', path: '/about' },
            { icon: '🎓', label: 'Services',            sub: 'Conversational, exam prep, business & more',     path: '/services' },
            { icon: '🎟', label: 'Pricing & Credits',   sub: '1 credit = 1 × 45-min lesson',                  path: '/pricing' },
            { icon: '✉️', label: 'Contact',             sub: 'Get in touch before you start',                  path: '/contact' },
          ].map(item => (
            <button key={item.path} className="menu-link" onClick={() => go(item.path)}>
              <div className="menu-link-icon">{item.icon}</div>
              <div className="menu-link-text">
                <strong>{item.label}</strong>
                <span>{item.sub}</span>
              </div>
              <span className="menu-link-arrow">→</span>
            </button>
          ))}
        </nav>

        <div className="menu-divider" />

        <div className="menu-cta">
          {currentUser ? (
            <button className="btn btn-primary btn-full" onClick={() => go('/dashboard')}>Go to my dashboard →</button>
          ) : (
            <>
              <button className="btn btn-primary btn-full" style={{ marginBottom: 10 }} onClick={() => go('/register')}>
                🌱 Create Account & Buy Credits
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => go('/login')}>
                Student Login →
              </button>
            </>
          )}
        </div>

        <div className="menu-footer-note">
          <span>© {new Date().getFullYear()} The Blooming Bilingual</span>
          <span>PayPal · Google Meet</span>
        </div>
      </div>
    </>
  );
}
