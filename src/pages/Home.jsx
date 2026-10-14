import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';

const HIGHLIGHTS = [
  { icon: 'logo',    title: 'Meet Neeliën',      desc: 'TEFL-certified English tutor from South Africa. Learn about her background and teaching style.', path: '/about' },
  { icon: 'lessons', title: 'What I Teach',      desc: 'Conversational English, exam prep, business English, homework support & more.', path: '/services' },
  { icon: 'credits', title: 'Credits & Pricing', desc: '1 credit = one 45-minute lesson. Buy 1–28 credits from $9 each. Credits never expire.', path: '/pricing' },
  { icon: 'mail',    title: 'Get in Touch',      desc: 'Questions before starting? Send a message. Neeliën replies within 24 hours.', path: '/contact' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-blob blob-1" aria-hidden="true" />
        <div className="hero-bg-blob blob-2" aria-hidden="true" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge"><Icon name="logo" weight="fill" /> Online English Tutoring · Worldwide</div>
            <h1>Learn English<br />with <em>confidence</em><br />&amp; care.</h1>
            <p className="hero-sub">One-on-one lessons with Neeliën Van Rooyen. Buy credits, book a 45-minute slot, and bloom at your own pace.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>Get Started</button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>Student Login <Icon name="arrow" /></button>
            </div>
            <div className="hero-stats">
              {[['1:1','Private lessons'],['45 min','Per lesson'],['Mon–Sat','Flexible times'],['$9–12','Per credit']].map(([v,l]) => (
                <div key={l} className="hero-stat"><span>{v}</span><p>{l}</p></div>
              ))}
            </div>
          </div>

          {/* Credit showcase (desktop only) */}
          <div className="hero-visual" aria-hidden="true">
            <div className="credit-showcase">
              <div className="credit-balance-display">
                <div className="credit-coin"><Icon name="credits" weight="fill" /></div>
                <div className="credit-amount">1</div>
                <div className="credit-label">credit = one 45-minute lesson</div>
                <div style={{ fontSize: '.78rem', opacity: .8, marginTop: 10 }}>Credits never expire</div>
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
            <Link key={h.title} to={h.path} className="highlight-card">
              <span className="highlight-icon"><Icon name={h.icon} /></span>
              <span className="highlight-body"><h3>{h.title}</h3><p>{h.desc}</p></span>
              <Icon name="arrow" className="highlight-arrow" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
