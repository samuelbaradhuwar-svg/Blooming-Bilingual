import { useNavigate } from 'react-router-dom';

const HIGHLIGHTS = [
  { icon: '🌸', title: 'Meet Neeliën', desc: 'TEFL-certified English tutor from South Africa. Learn about her background and teaching style.', path: '/about' },
  { icon: '🎓', title: 'What I Teach', desc: 'Conversational English, exam prep, business English, homework support & more.', path: '/services' },
  { icon: '🎟', title: 'Credits & Pricing', desc: '1 credit = 1 lesson of 45 min. Buy 1–28 credits from $9/credit. Credits never expire.', path: '/pricing' },
  { icon: '✉️', title: 'Get in Touch', desc: 'Questions before starting? Send a message — Neeliën replies within 24 hours.', path: '/contact' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-blob blob-1" />
        <div className="hero-bg-blob blob-2" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge">🌸 Online English Tutoring · Worldwide</div>
            <h1>Learn English<br />with <em>confidence</em><br />&amp; care.</h1>
            <p className="hero-sub">One-on-one lessons with Neeliën Van Rooyen. Buy credits, book a 45-minute slot, and bloom at your own pace.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>🌸 Get Started</button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>Student Login →</button>
            </div>
            <div className="hero-stats">
              {[['1:1','Private lessons'],['45min','Per lesson'],['Mon–Sat','Flexible times'],['$9–12','Per credit']].map(([v,l]) => (
                <div key={l} className="hero-stat"><span>{v}</span><p>{l}</p></div>
              ))}
            </div>
          </div>

          {/* Credit showcase (desktop only) */}
          <div className="hero-visual">
            <div className="credit-showcase">
              <div className="credit-balance-display">
                <div className="credit-coin">🎟</div>
                <div className="credit-amount">1</div>
                <div className="credit-label">credit = one 45-minute lesson</div>
                <div style={{ fontSize: '.7rem', opacity: .65, marginTop: 10 }}>Credits never expire</div>
              </div>
              {[
                { dot: 'var(--green)', title: 'Book any open time',  time: 'Shown in your own time zone', cost: '1 credit' },
                { dot: 'var(--blue)',  title: 'Free rescheduling',   time: 'Up to 2 hours before',        cost: '0 credits' },
              ].map(l => (
                <div key={l.title} className="mini-lesson-card">
                  <div className="mini-dot" style={{ background: l.dot }} />
                  <div className="mini-info"><strong>{l.title}</strong><span>{l.time}</span></div>
                  <span className="mini-credit-cost">{l.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Highlight cards */}
      <div className="home-highlights">
        <div className="home-highlights-inner">
          {HIGHLIGHTS.map(h => (
            <div key={h.title} className="highlight-card" onClick={() => navigate(h.path)}>
              <div className="highlight-icon">{h.icon}</div>
              <div className="highlight-body"><h3>{h.title}</h3><p>{h.desc}</p></div>
              <span className="highlight-arrow">→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-brand">
              <div className="nav-brand-icon">🌸</div>
              <div className="nav-brand-name" style={{ color: 'white' }}>The Blooming Bilingual</div>
            </div>
            <p>Premium online English tutoring by Neeliën Van Rooyen. One credit = one 45-minute lesson.</p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            {[['About','/about'],['Services','/services'],['Pricing','/pricing'],['Contact','/contact']].map(([l,p]) => (
              <a key={l} onClick={() => navigate(p)}>{l}</a>
            ))}
          </div>
          <div className="footer-col">
            <h4>Students</h4>
            <a onClick={() => navigate('/login')}>Login</a>
            <a onClick={() => navigate('/register')}>Create Account</a>
            <a onClick={() => navigate('/tutor-login')}>Tutor Login</a>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <a href="#">📧 Email</a>
            <a href="#">💬 WhatsApp</a>
            <a href="#">📸 Instagram</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The Blooming Bilingual · Neeliën Van Rooyen</span>
          <span style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a onClick={() => navigate('/privacy')} style={{ cursor: 'pointer' }}>Privacy</a>
            <a onClick={() => navigate('/terms')} style={{ cursor: 'pointer' }}>Terms</a>
          </span>
        </div>
      </footer>
    </>
  );
}
