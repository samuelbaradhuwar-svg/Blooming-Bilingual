import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { UploadForm, FileList } from '../../../components/FileExchange';
import { longDateIn, shortDateIn, timeIn } from '../../../lib/time';
import AdjustCredits from './AdjustCredits';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const REASONS = { purchase: 'Purchased credits', booking: 'Booked a lesson', refund: 'Refund', adjustment: 'Adjusted by tutor' };

export default function AdminStudentDetail({ id }) {
  const { currentUser, openModal, showToast } = useApp();
  const navigate = useNavigate();
  const tz = currentUser?.timezone || 'UTC';
  const [d, setD] = useState(null);
  const [level, setLevel] = useState('');
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, b, l, r, n] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, country, timezone, created_at, english_level, next_lesson_focus').eq('id', id).single(),
      supabase.from('bookings').select('id, starts_at, ends_at, subject, status, meet_url').eq('student_id', id).order('starts_at', { ascending: false }),
      supabase.from('credit_ledger').select('id, delta, reason, note, created_at').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('resources').select('id, uploader_id, title, category, storage_path, created_at').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('lesson_notes').select('booking_id, summary, homework').eq('student_id', id),
    ]);
    if (p.error || !p.data) { showToast('Could not find that student.', 'error'); navigate('/dashboard/admin-students', { replace: true }); return; }
    setD({ profile: p.data, bookings: b.data || [], ledger: l.data || [], resources: r.data || [], notes: Object.fromEntries((n.data || []).map(x => [x.booking_id, x])) });
    setLevel(p.data.english_level || '');
    setFocus(p.data.next_lesson_focus || '');
  }, [id, navigate, showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_update_student', { p_student: id, p_level: level, p_focus: focus });
    setBusy(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Saved.', 'success'); load();
  };

  if (!d) return (<><DashHeader title="Student" /><div className="dash-main"><p style={{ fontSize: '.85rem' }}>Loading…</p></div></>);

  const { profile: p, bookings, ledger, resources, notes } = d;
  const credits = ledger.reduce((s, x) => s + x.delta, 0);
  const now = Date.now();
  const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.ends_at).getTime() > now).reverse();
  const past = bookings.filter(b => !upcoming.includes(b));
  const next = upcoming[0];
  const dirty = level !== (p.english_level || '') || focus !== (p.next_lesson_focus || '');
  const studentTz = p.timezone || 'UTC';

  return (
    <>
      <DashHeader title={p.full_name || 'Student'}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/admin-students')}>← All students</button>
      </DashHeader>
      <div className="dash-main">
        <p style={{ fontSize: '.82rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
          {p.email} · {p.country || 'Country not set'} · {studentTz.replace(/_/g, ' ')} · joined {new Date(p.created_at).toLocaleDateString()}
        </p>

        <div className="dash-grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--green-bg)' }}>📈</div><div className="stat-num">{p.english_level || '—'}</div><div className="stat-label">English level</div></div>
          <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(212,96,138,.08)' }}>🎟</div><div className="stat-num" style={{ color: credits > 0 ? undefined : 'var(--red)' }}>{credits}</div><div className="stat-label">Credits</div></div>
          <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--orange-bg)' }}>📅</div><div className="stat-num">{upcoming.length}</div><div className="stat-label">Upcoming lessons</div></div>
          <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--purple-bg)' }}>📁</div><div className="stat-num">{resources.length}</div><div className="stat-label">Files exchanged</div></div>
        </div>

        <div className="dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 10 }}>📅 Next lesson</div>
              {next ? (
                <div style={{ background: 'linear-gradient(130deg,var(--navy),#6B2045)', borderRadius: 'var(--radius-sm)', padding: 16, color: 'white' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', fontWeight: 600 }}>{longDateIn(tz, new Date(next.starts_at))} · {timeIn(tz, new Date(next.starts_at))}</div>
                  <div style={{ fontSize: '.8rem', opacity: .8, marginTop: 4 }}>{next.subject} · for the student: {shortDateIn(studentTz, new Date(next.starts_at))} {timeIn(studentTz, new Date(next.starts_at))} ({studentTz.replace(/_/g, ' ')})</div>
                  {next.meet_url && <a className="join-btn" style={{ marginTop: 10, display: 'inline-block' }} href={next.meet_url} target="_blank" rel="noreferrer">🎥 Join</a>}
                </div>
              ) : <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No lesson booked.</p>}
              {upcoming.length > 1 && <p style={{ fontSize: '.78rem', color: 'var(--ink-muted)', marginTop: 10 }}>+ {upcoming.length - 1} more: {upcoming.slice(1, 4).map(b => shortDateIn(tz, new Date(b.starts_at))).join(', ')}{upcoming.length > 4 ? '…' : ''}</p>}
            </div>

            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 10 }}>📝 Level & plan</div>
              <div className="form-group">
                <label>English level (you decide)</label>
                <select value={level} onChange={e => setLevel(e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="">Not assessed yet</option>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Plan for the next lesson — the student can see this</label>
                <textarea rows={3} maxLength={1000} value={focus} onChange={e => setFocus(e.target.value)} placeholder="e.g. Practise past tenses; bring your essay draft." />
              </div>
              <button className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
            </div>

            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 6 }}>🎓 Lesson history ({past.length})</div>
              {past.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No past lessons yet.</p> : past.slice(0, 10).map(b => (
                <div key={b.id} className="hw-item" style={{ flexWrap: 'wrap' }}>
                  <div className="hw-info" style={{ flex: 1, minWidth: 180 }}>
                    <strong>{shortDateIn(tz, new Date(b.starts_at))} · {b.subject}</strong>
                    {notes[b.id]?.summary && <span>📝 {notes[b.id].summary}</span>}
                    {notes[b.id]?.homework && <span>📚 Homework: {notes[b.id].homework}</span>}
                  </div>
                  <span style={{ fontSize: '.7rem', color: b.status === 'cancelled' ? 'var(--red)' : 'var(--ink-muted)' }}>{b.status === 'cancelled' ? 'Cancelled' : 'Done'}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title">🎟 Credits</span>
                <button className="card-link" onClick={() => openModal('Adjust credits', <AdjustCredits student={{ id, full_name: p.full_name, credits }} onDone={load} />)}>Adjust</button>
              </div>
              {ledger.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No credit activity yet.</p> : ledger.slice(0, 8).map(x => (
                <div key={x.id} className="hw-item">
                  <div className="hw-info"><strong>{REASONS[x.reason]}</strong><span>{new Date(x.created_at).toLocaleDateString()}{x.note ? ` · ${x.note}` : ''}</span></div>
                  <strong style={{ color: x.delta > 0 ? '#15803d' : 'var(--ink-soft)' }}>{x.delta > 0 ? '+' : ''}{x.delta}</strong>
                </div>
              ))}
            </div>

            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 4 }}>📁 Files with {p.full_name?.split(' ')[0] || 'student'} ({resources.length})</div>
              <p style={{ fontSize: '.78rem', color: 'var(--ink-muted)', marginBottom: 10 }}>Private between you and this student.</p>
              <UploadForm studentId={id} onDone={load} label="⬆ Send to student" />
              <FileList items={resources} who={r => r.uploader_id === id ? 'From student' : 'Sent by you'} canDelete={() => true} onChange={load} empty="No files yet." />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
