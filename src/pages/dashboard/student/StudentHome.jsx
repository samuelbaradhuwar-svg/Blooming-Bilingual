import { useApp } from '../../../context/AppContext';
import DashHeader from '../../../components/dashboard/DashHeader';
import { getGreeting } from '../../../data/constants';

export default function StudentHome({ onSwitch, onBuyCredits }) {
  const { currentUser, showToast } = useApp();
  const greeting = getGreeting();
  const name = currentUser?.name?.split(' ')[0] ?? 'there';

  return (
    <>
      <DashHeader title={`${greeting}, ${name} 👋`}>
        <button className="btn btn-primary btn-sm" onClick={onBuyCredits}>🎟 Buy Credits</button>
      </DashHeader>

      <div className="dash-main">
        {/* Stats */}
        <div className="dash-grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(212,96,138,.08)' }}>🎓</div>
            <div className="stat-num">12</div>
            <div className="stat-label">Lessons completed</div>
            <div className="stat-trend up">↑ 4 this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--green-bg)' }}>📈</div>
            <div className="stat-num">B2</div>
            <div className="stat-label">Current level</div>
            <div className="stat-trend up">↑ From B1</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--orange-bg)' }}>🔥</div>
            <div className="stat-num">14</div>
            <div className="stat-label">Day streak</div>
            <div className="stat-trend up">Personal best!</div>
          </div>
          <div className="stat-card" onClick={() => onSwitch('resources')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'var(--purple-bg)' }}>📁</div>
            <div className="stat-num">9</div>
            <div className="stat-label">Resources</div>
            <div className="stat-trend up">↑ 2 new files</div>
          </div>
        </div>

        {/* Main grid */}
        <div className="dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Upcoming lesson */}
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title">📅 Upcoming Lesson</span>
                <button className="card-link" onClick={() => onSwitch('booking')}>Book more</button>
              </div>
              <div style={{ background: 'linear-gradient(130deg,var(--navy),#6B2045)', borderRadius: 'var(--radius-sm)', padding: 16, color: 'white', marginBottom: 10 }}>
                <div style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: .6, marginBottom: 4 }}>Next · Tuesday 4:00 PM</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>Conversational English</div>
                <button className="join-btn" onClick={() => showToast('Google Meet link would open here.', 'info')}>🎥 Join Lesson</button>
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--ink-muted)', padding: '8px 0' }}>
                🎟 1 credit will be used · Reschedule free if &gt;2hrs before
              </div>
            </div>

            {/* Recent resources */}
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title">📁 Recent Resources</span>
                <button className="card-link" onClick={() => onSwitch('resources')}>View all</button>
              </div>
              {[
                { icon: '📄', bg: '#FEE2E2', title: 'Grammar Reference Guide', meta: 'PDF · Added by Neeliën' },
                { icon: '📘', bg: 'rgba(212,96,138,.08)', title: 'IELTS Writing Samples', meta: 'PDF · Added by Neeliën' },
              ].map(r => (
                <div key={r.title} className="hw-item">
                  <div className="hw-icon" style={{ background: r.bg }}>{r.icon}</div>
                  <div className="hw-info"><strong>{r.title}</strong><span>{r.meta}</span></div>
                  <button className="btn btn-ghost btn-sm" onClick={() => showToast('Download started.', 'info')}>↓</button>
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
                <button className="btn btn-outline btn-sm btn-full" onClick={() => onSwitch('resources')}>
                  + Upload a file for Neeliën
                </button>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Progress */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 14 }}>My Progress</div>
              {[
                { label: 'Grammar', pct: 78, color: 'var(--blue)' },
                { label: 'Vocabulary', pct: 65, color: '#E8829F' },
                { label: 'Speaking', pct: 55, color: 'var(--purple)' },
                { label: 'Writing', pct: 82, color: 'var(--green)' },
              ].map(p => (
                <div key={p.label} className="prog-item">
                  <div className="prog-header"><strong>{p.label}</strong><span>{p.pct}%</span></div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: `${p.pct}%`, background: p.color }} /></div>
                </div>
              ))}
            </div>

            {/* Credits */}
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2.5rem', fontWeight: 700, color: 'var(--navy)' }}>
                {currentUser?.credits ?? 0}
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--ink-muted)', marginBottom: 12 }}>credits available</div>
              <button className="btn btn-primary btn-sm" onClick={onBuyCredits}>🎟 Buy More</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
