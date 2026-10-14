import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from './ui/Icon';
import Brand from './ui/Brand';

const LINKS = [
  { icon: 'logo',     label: 'About',   long: 'About Neeliën',     sub: 'Meet your tutor and her background',  path: '/about' },
  { icon: 'lessons',  label: 'Services', long: 'Services',          sub: 'Conversation, exam prep, business & more', path: '/services' },
  { icon: 'credits',  label: 'Pricing',  long: 'Pricing & Credits', sub: '1 credit = one 45-minute lesson',     path: '/pricing' },
  { icon: 'mail',     label: 'Contact',  long: 'Contact',           sub: 'Ask a question before you start',     path: '/contact' },
];

export default function PublicNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { currentUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);
  const go = (path) => { navigate(path); close(); };

  // Close the drawer when the page changes or Escape is pressed.
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const isActive = (path) => pathname === path;

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="public-nav">
        <Brand />

        <nav className="nav-links" aria-label="Main">
          {[{ path: '/', label: 'Home' }, ...LINKS].map(l => (
            <Link key={l.path} to={l.path} className={`nav-link ${isActive(l.path) ? 'active' : ''}`} aria-current={isActive(l.path) ? 'page' : undefined}>{l.label}</Link>
          ))}
        </nav>

        <div className="nav-actions">
          {currentUser ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>My Dashboard</button>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm nav-login" onClick={() => navigate('/login')}>Log In</button>
              <button className="btn btn-primary btn-sm nav-cta" onClick={() => navigate('/register')}>Register</button>
            </>
          )}
          <button
            className={`burger-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <div className={`menu-overlay ${menuOpen ? 'open' : ''}`} onClick={close} />

      <div id="site-menu" className={`menu-drawer ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        <div className="menu-drawer-header">
          <Brand onClick={close} />
          <button className="menu-close-btn" onClick={close} aria-label="Close menu"><Icon name="close" /></button>
        </div>

        <nav className="menu-nav" aria-label="Site">
          {LINKS.map(item => (
            <Link key={item.path} to={item.path} className={`menu-link ${isActive(item.path) ? 'active' : ''}`} onClick={close}>
              <span className="menu-link-icon"><Icon name={item.icon} /></span>
              <span className="menu-link-text">
                <strong>{item.long}</strong>
                <span>{item.sub}</span>
              </span>
              <Icon name="arrow" className="menu-link-arrow" />
            </Link>
          ))}
        </nav>

        <div className="menu-divider" />

        <div className="menu-cta">
          {currentUser ? (
            <button className="btn btn-primary btn-full" onClick={() => go('/dashboard')}>Go to My Dashboard</button>
          ) : (
            <>
              <button className="btn btn-primary btn-full" style={{ marginBottom: 10 }} onClick={() => go('/register')}>
                Create Account & Buy Credits
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => go('/login')}>Student Login</button>
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
