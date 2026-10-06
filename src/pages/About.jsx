import { useNavigate } from 'react-router-dom';

const QUALS = [
  'TEFL certified',
  'BA in English Linguistics, University of Pretoria',
  'Specialised in IELTS, TOEFL & Cambridge exam prep',
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
              {[['1:1','Private lessons'],['45min','Per lesson'],['Mon–Sat','Flexible times'],['🌍','Students worldwide']].map(([n,l]) => (
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

    </>
  );
}
