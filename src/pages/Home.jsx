import { useNavigate } from 'react-router-dom';

const HIGHLIGHTS = [
  { icon: '🌸', title: 'Meet Neeliën', desc: 'TEFL-certified. 5+ years. 200+ students across 14 countries. Watch her intro video.', path: '/about' },
  { icon: '🎓', title: 'What I Teach', desc: 'Conversational English, exam prep, business English, homework support & more.', path: '/services' },
  { icon: '🎟', title: 'Credits & Pricing', desc: '1 credit = 1 lesson of 45 min. Buy 1–28 credits from €9/credit. Credits never expire.', path: '/pricing' },
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
              {[['200+','Students taught'],['14','Countries'],['4.9★','Avg. rating'],['45min','Per credit']].map(([v,l]) => (
                <div key={l} className="hero-stat"><span>{v}</span><p>{l}</p></div>
              ))}
            </div>
          </div>

          {/* Credit showcase (desktop only) */}
          <div className="hero-visual">
            <div className="credit-showcase">
              <div className="credit-balance-display">
                <div className="credit-coin">🎟</div>
                <div className="credit-amount">8</div>
                <div className="credit-label">Lesson Credits</div>
                <div style={{ height: 6, borderRadius: 10, background: 'rgba(255,255,255,.15)', marginTop: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '57%', background: '#E8829F', borderRadius: 10 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.65rem', opacity: .6, marginTop: 4 }}>
                  <span>8 remaining</span><span>14 used</span>
                </div>
              </div>
              {[
                { dot: 'var(--green)', title: 'Conversational English', time: 'Tue 17 Jun · 4:00 PM', cost: '1 credit' },
                { dot: 'var(--blue)',  title: 'IELTS Writing Task 2',   time: 'Fri 20 Jun · 5:00 PM', cost: '1 credit' },
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
          <span>Stripe · PayFast · Google Meet</span>
        </div>
      </footer>
    </>
  );
}
