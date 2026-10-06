import { useNavigate } from 'react-router-dom';

const QUALS = [
  'TEFL Certified — 120-hour accredited programme',
  'BA in English Linguistics, University of Pretoria',
  '5+ years online tutoring experience',
  'Specialised in IELTS, TOEFL & Cambridge exam prep',
];

const TESTIMONIALS = [
  { av: 'A', color: '#D4608A', text: '"Passed my IELTS with 7.5 after 8 sessions. Neeliën\'s patience and structure made all the difference."', name: 'Amira K.', meta: 'IELTS · Netherlands' },
  { av: 'T', color: '#F59E0B', text: '"My business English went from nervous to genuinely confident. Every session was perfectly tailored."', name: 'Takeshi M.', meta: 'Business English · Japan' },
  { av: 'S', color: '#22C55E', text: '"The credit system means I learn at my own pace. Booking is seamless and Neeliën is wonderful."', name: 'Sofia L.', meta: 'Conversational · Brazil' },
];

export default function About() {
  const navigate = useNavigate();
  return (
    <>
      <div className="about-hero">
        <div className="about-grid">
          <div>
            <div className="about-photo">
              <div className="about-photo-initials">NvR</div>
            </div>
            <div style={{ background: 'var(--navy)', borderRadius: 'var(--radius-sm)', padding: 20, color: 'white', textAlign: 'center', marginTop: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.2rem' }}>▶</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', fontWeight: 600, marginBottom: 3 }}>Meet Neeliën</div>
              <div style={{ fontSize: '.72rem', opacity: .55, marginBottom: 14 }}>Short intro · ~2 minutes</div>
              <button className="btn btn-sm btn-full" style={{ background: 'rgba(255,255,255,.12)', color: 'white', border: '1px solid rgba(255,255,255,.2)' }}
                onClick={() => alert('Paste your YouTube/Vimeo embed URL here')}>
                ▶ Watch Introduction
              </button>
            </div>
          </div>

          <div>
            <div className="section-label">Your tutor</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(2rem,3vw,2.8rem)', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.15, marginBottom: 16 }}>
              Hi, I'm Neeliën<br />Van Rooyen. 🌸
            </h1>
            <p style={{ fontSize: '.95rem', color: 'var(--ink-soft)', fontWeight: 300, lineHeight: 1.85, marginBottom: 14 }}>
              I'm a TEFL-certified English tutor from South Africa with a passion for helping international students find their voice — whether for everyday conversations, academic goals, or professional growth.
            </p>
            <p style={{ fontSize: '.95rem', color: 'var(--ink-soft)', fontWeight: 300, lineHeight: 1.85, marginBottom: 24 }}>
              My teaching philosophy: <em style={{ color: 'var(--navy)' }}>every student blooms at their own pace.</em>
            </p>

            <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-muted)', marginBottom: 14 }}>Qualifications</div>
              {QUALS.map(q => (
                <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.875rem', color: 'var(--ink-soft)', marginBottom: 9 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, display: 'block' }} />
                  {q}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
              {[['200+','Students'],['14','Countries'],['4.9★','Rating'],['5yrs','Experience']].map(([n,l]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)' }}>{n}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--ink-muted)' }}>{l}</div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={() => navigate('/pricing')}>🎟 Buy Credits & Get Started</button>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <section className="section">
        <div className="section-inner">
          <div className="section-label" style={{ textAlign: 'center' }}>What students say</div>
          <div className="testi-grid" style={{ marginTop: 32 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-text">{t.text}</p>
                <div className="testi-author">
                  <div className="testi-avatar" style={{ background: t.color }}>{t.av}</div>
                  <div><div className="testi-name">{t.name}</div><div className="testi-meta">{t.meta}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
