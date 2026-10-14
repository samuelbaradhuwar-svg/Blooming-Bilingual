import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Hibiscus from '../components/ui/Hibiscus';
import { BRAND } from '../data/brand';

const FEATURES = [
  { icon: 'student',  title: 'Personalised 1:1 lessons',  text: 'Every lesson is built around you and your goals.' },
  { icon: 'globe',    title: 'Flexible international scheduling', text: 'Book a time and see it in your own time zone.' },
  { icon: 'lessons',  title: 'Experienced tutoring',      text: 'TEFL-certified tutor from South Africa.' },
  { icon: 'progress', title: 'Structured learning progress', text: 'Lesson notes, homework and a clear level.' },
  { icon: 'credits',  title: 'Simple credit booking',     text: 'One credit is one 45-minute lesson.' },
];

const STEPS = [
  { title: 'Create your account', text: 'Sign up in a minute. Your time zone is saved so lesson times always make sense.' },
  { title: 'Buy credits', text: 'Choose 1 to 28 credits and pay securely with PayPal. Credits never expire.' },
  { title: 'Book your lesson', text: 'Pick any open time. A Google Meet link and calendar invite arrive straight away.' },
  { title: 'Learn and grow', text: 'After each lesson you get notes and homework, and your progress builds over time.' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero */}
      <section className="hero" aria-labelledby="hero-title">
        <Hibiscus className="hero-flower" />
        <div className="hero-fade" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-kicker"><Icon name="logo" weight="fill" /> Online English tutoring · Worldwide</div>
            <h1 id="hero-title">Confident English.<em>A World of Possibilities.</em></h1>
            <p className="hero-sub">Personalised online English lessons designed to help you communicate confidently, achieve your goals and open doors to new opportunities.</p>
            <div className="hero-actions">
              <button className="btn btn-light btn-lg" onClick={() => navigate('/register')}>Start Learning</button>
              <button className="btn btn-ghost-light btn-lg" onClick={() => navigate('/services')}>Explore Lessons</button>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="feature-strip" aria-label="What you get">
        <div className="feature-strip-inner">
          {FEATURES.map(f => (
            <div key={f.title} className="feature">
              <Icon name={f.icon} />
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="band">
        <div className="band-inner split">
          <div>
            <div className="section-label">How it works</div>
            <h2 className="display">From first click to <em>confident conversation.</em></h2>
            <p className="lede">No subscriptions and no contracts. Buy credits when you need them, and book lessons around your life.</p>
            <div style={{ marginTop: 26 }}>
              <Link to="/pricing" className="btn btn-outline">See pricing</Link>
            </div>
          </div>
          <ol className="steps-list">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="num" aria-hidden="true">{i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Meet the tutor */}
      <section className="band tutor-teaser">
        <Hibiscus variant="silhouette" className="hibiscus-bg" />
        <div className="band-inner split is-even" style={{ alignItems: 'center', position: 'relative' }}>
          <p className="quote">“Every student blooms at their own pace.”</p>
          <div>
            <div className="section-label">Your tutor</div>
            <h2 className="display">Meet {BRAND.tutor}</h2>
            <p className="lede" style={{ marginBottom: 22 }}>A TEFL-certified English tutor from South Africa with a passion for helping international students find their voice, for everyday conversation, academic goals or professional growth.</p>
            <Link to="/about" className="btn btn-primary">Read Neeliën’s story</Link>
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="band">
        <div className="band-inner">
          <div className="cta-final">
            <Hibiscus className="hibiscus" />
            <h2>Ready to find your voice?</h2>
            <p>Create your free account and book your first lesson today.</p>
            <div className="actions">
              <button className="btn btn-light btn-lg" onClick={() => navigate('/register')}>Start Learning</button>
              <button className="btn btn-ghost-light btn-lg" onClick={() => navigate('/contact')}>Ask a question</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
