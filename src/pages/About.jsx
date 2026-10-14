import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';

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
            <h1 className="about-title">Hi, I’m Neeliën<br />Van Rooyen.</h1>
            <p className="about-text">
              I’m a TEFL-certified English tutor from South Africa with a passion for helping international students find their voice — whether for everyday conversations, academic goals, or professional growth.
            </p>
            <p className="about-text" style={{ marginBottom: 24 }}>
              My teaching philosophy: <em style={{ color: 'var(--navy)' }}>every student blooms at their own pace.</em>
            </p>

            <div className="about-quals">
              <h2>Qualifications</h2>
              <ul>
                {QUALS.map(q => (
                  <li key={q}><Icon name="check" weight="bold" />{q}</li>
                ))}
              </ul>
            </div>

            <div className="about-stats">
              {[['1:1','Private lessons'],['45 min','Per lesson'],['Mon–Sat','Flexible times'],['Worldwide','Students']].map(([n,l]) => (
                <div key={l}>
                  <div className="about-stat-num">{n}</div>
                  <div className="about-stat-label">{l}</div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={() => navigate('/pricing')}>Buy Credits & Get Started</button>
          </div>
        </div>
      </div>
    </>
  );
}
