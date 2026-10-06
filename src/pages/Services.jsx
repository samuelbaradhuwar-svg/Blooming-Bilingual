import { useNavigate } from 'react-router-dom';

const SERVICES = [
  { icon: '💬', bg: 'rgba(212,96,138,0.08)', title: 'Conversational English', desc: 'Build natural fluency through structured conversation. Covers pronunciation, vocabulary, everyday expressions, and real-world speaking confidence. All levels A1–C2.', badge: '1 credit', badgeCls: 'chip-blue' },
  { icon: '🏆', bg: 'var(--orange-bg)', title: 'Exam Preparation', desc: 'IELTS, TOEFL, Cambridge B2/C1/C2 — strategic preparation with practice tests, task-type breakdown, timed writing, and expert feedback.', badge: '1 credit', badgeCls: 'chip-orange' },
  { icon: '📚', bg: 'var(--green-bg)', title: 'Homework & Assignment Support', desc: 'Guided support on English school assignments, essays, grammar exercises, and written work. Perfect for students who need a focused expert walkthrough.', badge: '1 credit', badgeCls: 'chip-green' },
  { icon: '💼', bg: 'var(--purple-bg)', title: 'Business English', desc: 'Professional communication for meetings, presentations, emails, and negotiations. Build the language confidence to thrive in international work environments.', badge: '1 credit', badgeCls: 'chip-purple' },
  { icon: '📈', bg: '#FAE4EB', title: 'Progress Tracking & Resources', desc: 'Your student dashboard tracks improvement across all skills. Access PDFs, worksheets, and study materials Neeliën adds just for you.', badge: 'Included', badgeCls: '' },
];

const STEPS = [['🎟','Buy Credits','Choose 1–28'],['📅','Book a Slot','4 PM–1 AM daily'],['🎥','Attend Live','Google Meet / Zoom'],['📊','Track Progress','Your dashboard']];

export default function Services() {
  const navigate = useNavigate();
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="section-label">What I offer</div>
          <h1 className="section-title">Every 45-minute lesson<br />built around your goals.</h1>
          <p className="section-sub">One credit books one session. Choose your focus and Neeliën adapts the lesson completely to you.</p>
        </div>
      </div>

      <section className="section">
        <div className="section-inner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SERVICES.map(s => (
              <div key={s.title} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 20, alignItems: 'center', background: 'white', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow .2s' }}
                onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                <div style={{ width: 54, height: 54, background: s.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{s.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--ink-muted)', fontWeight: 300, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
                <span className={`chip ${s.badgeCls}`} style={{ flexShrink: 0 }}>{s.badge}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius)', padding: '28px 32px', marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, textAlign: 'center' }}>
            {STEPS.map(([icon,title,sub]) => (
              <div key={title}>
                <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--navy)' }}>{title}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--ink-muted)', marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/pricing')}>🎟 See Pricing & Buy Credits</button>
          </div>
        </div>
      </section>
    </>
  );
}
