import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';

const SERVICES = [
  { icon: 'chat',     bg: 'rgba(184,65,107,0.1)', title: 'Conversational English', desc: 'Build natural fluency through structured conversation. Covers pronunciation, vocabulary, everyday expressions, and real-world speaking confidence. All levels A1–C2.', badge: '1 credit', badgeCls: 'chip-blue' },
  { icon: 'trophy',   bg: 'var(--orange-bg)',     title: 'Exam Preparation', desc: 'IELTS, TOEFL, Cambridge B2/C1/C2: strategic preparation with practice tests, task-type breakdown, timed writing, and expert feedback.', badge: '1 credit', badgeCls: 'chip-orange' },
  { icon: 'books',    bg: 'var(--green-bg)',      title: 'Homework & Assignment Support', desc: 'Guided support on English school assignments, essays, grammar exercises, and written work. Perfect for students who need a focused expert walkthrough.', badge: '1 credit', badgeCls: 'chip-green' },
  { icon: 'business', bg: 'var(--purple-bg)',     title: 'Business English', desc: 'Professional communication for meetings, presentations, emails, and negotiations. Build the language confidence to thrive in international work environments.', badge: '1 credit', badgeCls: 'chip-purple' },
  { icon: 'progress', bg: '#FAE4EB',              title: 'Progress Tracking & Files', desc: 'Your student dashboard shows your level, lesson notes, and homework after every lesson. Share files privately with Neeliën, and she can send you worksheets and study materials.', badge: 'Included', badgeCls: 'chip-blue' },
];

const STEPS = [
  ['credits', 'Buy Credits', 'Choose 1–28'],
  ['calendar', 'Book a Slot', 'Mon–Sat, 9 AM–1 AM (SAST)'],
  ['video', 'Attend Live', 'Google Meet link included'],
  ['progress', 'Track Progress', 'Notes and homework in your dashboard'],
];

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
          <div className="service-list">
            {SERVICES.map(s => (
              <article key={s.title} className="service-row">
                <div className="service-icon" style={{ background: s.bg }}><Icon name={s.icon} /></div>
                <div className="service-body">
                  <h2>{s.title}</h2>
                  <p>{s.desc}</p>
                </div>
                <span className={`chip ${s.badgeCls}`}>{s.badge}</span>
              </article>
            ))}
          </div>

          <ol className="steps">
            {STEPS.map(([icon, title, sub], i) => (
              <li key={title}>
                <span className="step-icon"><Icon name={icon} /></span>
                <span className="step-title">{i + 1}. {title}</span>
                <span className="step-sub">{sub}</span>
              </li>
            ))}
          </ol>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/pricing')}>See Pricing & Buy Credits</button>
          </div>
        </div>
      </section>
    </>
  );
}
