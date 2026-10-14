import { Link } from 'react-router-dom';
import Icon from './ui/Icon';
import Brand from './ui/Brand';

export default function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Brand tone="light" />
          <p>One-on-one online English tutoring by Neeliën Van Rooyen. One credit = one 45-minute lesson.</p>
        </div>
        <nav className="footer-col" aria-label="Explore">
          <h2>Explore</h2>
          <Link to="/about">About</Link>
          <Link to="/services">Services</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <nav className="footer-col" aria-label="Students">
          <h2>Students</h2>
          <Link to="/login">Login</Link>
          <Link to="/register">Create Account</Link>
        </nav>
        <nav className="footer-col" aria-label="Get in touch">
          <h2>Questions?</h2>
          <Link to="/contact"><Icon name="mail" /> Send a message</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} The Blooming Bilingual · Neeliën Van Rooyen</span>
        <span style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </span>
      </div>
    </footer>
  );
}
