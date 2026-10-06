import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { getGreeting } from '../../../data/constants';

export default function AdminHome({ onSwitch }) {
  const { showToast } = useApp();
  const greeting = getGreeting();

  return (
    <>
      <DashHeader title={`${greeting}, Neeliën 🌸`}>
        <button className="btn btn-primary btn-sm" onClick={() => showToast('Create lesson — coming soon.', 'info')}>+ New Lesson</button>
      </DashHeader>

      <div className="dash-main">
        {/* Welcome hero */}
        <div style={{ background: 'linear-gradient(130deg,var(--navy) 0%,#6B2045 100%)', borderRadius: 'var(--radius)', padding: 'clamp(20px,4vw,28px)', color: 'white', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.04)', top: -60, right: -40, pointerEvents: 'none' }} />
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),#E8829F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>NvR</div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.1rem,3vw,1.4rem)', fontWeight: 600, marginBottom: 3 }}>Welcome back, Neeliën.</div>
            <div style={{ fontSize: '.82rem', opacity: .75, fontWeight: 300 }}>You have <strong>3 lessons today</strong> and <strong>4 student uploads</strong> awaiting review.</div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['24','Students'],['€2,840','Revenue · June'],['4.9★','Rating']].map(([n,l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700 }}>{n}</div>
                <div style={{ fontSize: '.68rem', opacity: .65 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="dash-grid-4" style={{ marginBottom: 16 }}>
          {[
            { icon: '👥', bg: 'rgba(212,96,138,.08)', num: '24',    label: 'Active students',   trend: '↑ 3 this month', up: true },
            { icon: '💰', bg: 'var(--green-bg)',       num: '€2,840',label: 'Revenue · June',    trend: '↑ 18% vs May',   up: true },
            { icon: '📅', bg: 'var(--orange-bg)',      num: '3',     label: 'Lessons today',     trend: 'Next: 4:00 PM',  up: true },
            { icon: '⬆️', bg: 'var(--red-bg)',         num: '4',     label: 'Uploads to review', trend: 'Awaiting',       up: false },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-trend ${s.up ? 'up' : 'warn'}`}>{s.trend}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Today's schedule */}
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title">📅 Today's Schedule</span>
                <button className="card-link" onClick={() => onSwitch('admin-bookings')}>Full calendar →</button>
              </div>
              <div style={{ background: 'linear-gradient(130deg,var(--navy),#6B2045)', borderRadius: 'var(--radius-sm)', padding: 16, color: 'white', marginBottom: 12 }}>
                <div style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: .6, marginBottom: 4 }}>▶ Now — 4:00 PM</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', fontWeight: 600, marginBottom: 2 }}>Sofia Lindqvist · Conversational English</div>
                <div style={{ fontSize: '.78rem', opacity: .75, marginBottom: 12 }}>45 min · Google Meet</div>
                <button className="join-btn" onClick={() => showToast('Opening Google Meet for Sofia…', 'info')}>🎥 Join Now</button>
              </div>
              {[{ av: 'T', color: 'var(--orange)', name: 'Takeshi Mori', info: '6:00 PM · Business English' },
                { av: 'A', color: '#E8829F',       name: 'Amira Khalid',  info: '8:00 PM · IELTS Prep' }].map(s => (
                <div key={s.name} className="hw-item">
                  <div className="hw-icon" style={{ background: s.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{s.av}</div>
                  <div className="hw-info"><strong>{s.name}</strong><span>{s.info}</span></div>
                  <button className="btn btn-outline btn-sm" onClick={() => showToast(`Link ready for ${s.name.split(' ')[0]}.`, 'info')}>Prep</button>
                </div>
              ))}
            </div>

            {/* Student uploads */}
            <div className="card card-pad">
              <div className="card-header">
                <div><span className="card-title">⬆️ Student Uploads</span> <span className="chip chip-orange" style={{ fontSize: '.62rem', marginLeft: 4 }}>4</span></div>
                <button className="card-link" onClick={() => onSwitch('admin-resources')}>View all →</button>
              </div>
              {[{ icon: '📝', bg: '#FEE2E2', name: 'Sofia', file: 'Essay Draft', date: '12 Jun', student: 'Sofia Lindqvist' },
                { icon: '📄', bg: 'rgba(212,96,138,.08)', name: 'Amira', file: 'IELTS Practice', date: '10 Jun', student: 'Amira Khalid' }].map(u => (
                <div key={u.file} className="hw-item">
                  <div className="hw-icon" style={{ background: u.bg }}>{u.icon}</div>
                  <div className="hw-info"><strong>{u.name} · {u.file}</strong><span>{u.date}</span></div>
                  <button className="btn btn-primary btn-sm" onClick={() => showToast(`Reviewing ${u.file}…`, 'info')}>Review</button>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Revenue */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 14 }}>💰 Revenue · June</div>
              {[{ label: 'Credit packs', pct: 68, amount: '€1,920', color: 'var(--blue)' },
                { label: 'Single credits', pct: 20, amount: '€560', color: '#E8829F' }].map(r => (
                <div key={r.label} className="prog-item">
                  <div className="prog-header"><strong>{r.label}</strong><span>{r.amount}</span></div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: `${r.pct}%`, background: r.color }} /></div>
                </div>
              ))}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
                <strong>Total</strong><strong style={{ color: 'var(--green)' }}>€2,840</strong>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={() => onSwitch('admin-billing')}>View Invoices →</button>
            </div>

            {/* Outstanding */}
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title">⚠️ Outstanding</span>
                <button className="card-link" onClick={() => onSwitch('admin-billing')}>All →</button>
              </div>
              <div className="hw-item">
                <div className="hw-icon" style={{ background: 'var(--red-bg)' }}>⚠️</div>
                <div className="hw-info"><strong>Marie-Claire D.</strong><span>€160 · Overdue 5 days</span></div>
                <button className="btn btn-sm" style={{ background: 'var(--red)', color: 'white', flexShrink: 0 }} onClick={() => showToast('Reminder sent to Marie-Claire.', 'success')}>Remind</button>
              </div>
            </div>

            {/* Credit rate card */}
            <div className="card card-pad" style={{ background: 'linear-gradient(135deg,var(--navy),#6B2045)', color: 'white' }}>
              <div style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: .6, marginBottom: 4 }}>Current Credit Rate</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2rem', fontWeight: 700 }}>€12 <span style={{ fontSize: '.9rem', opacity: .55, fontWeight: 400 }}>/credit</span></div>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.12)', color: 'white', marginTop: 10 }} onClick={() => onSwitch('admin-settings')}>Change Rate →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
