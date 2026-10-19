import { useCallback, useEffect, useState } from 'react';
import { PersonAvatar, useStudentAvatars } from '../../../components/ui/avatars';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { UploadForm, FileList } from '../../../components/FileExchange';
import { longDateIn, shortDateIn, timeIn } from '../../../lib/time';
import AdjustCredits from './AdjustCredits';
import Icon from '../../../components/ui/Icon';
import Field from '../../../components/ui/Field';
import EmptyState from '../../../components/ui/EmptyState';
import ChatThread from '../../../components/ChatThread';
import BookForStudent from '../../../components/BookForStudent';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const REASONS = { purchase: 'Purchased credits', booking: 'Booked a lesson', refund: 'Refund', adjustment: 'Adjusted by tutor' };
const TABS = [['overview', 'Overview'], ['lessons', 'Lessons'], ['chat', 'Chat'], ['credits', 'Credits'], ['files', 'Files']];
const PAGE = 15;   // how many history rows to show before "Show more"

const initials = (n) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export default function AdminStudentDetail({ id }) {
  const { currentUser, openModal, showToast } = useApp();
  const navigate = useNavigate();
  const av = useStudentAvatars();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview';
  const setTab = (k) => setParams(k === 'overview' ? {} : { tab: k }, { replace: true });
  const tz = currentUser?.timezone || 'UTC';
  const [d, setD] = useState(null);
  const [level, setLevel] = useState('');
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [showAllLedger, setShowAllLedger] = useState(false);

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
  const first = p.full_name?.split(' ')[0] || 'student';
  const credits = ledger.reduce((s, x) => s + x.delta, 0);
  const now = Date.now();
  const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.ends_at).getTime() > now).reverse();
  const past = bookings.filter(b => !upcoming.includes(b));
  const completed = past.filter(b => b.status !== 'cancelled');
  const next = upcoming[0];
  const lastWithNotes = past.find(b => notes[b.id]?.summary || notes[b.id]?.homework);
  const dirty = level !== (p.english_level || '') || focus !== (p.next_lesson_focus || '');
  const studentTz = p.timezone || 'UTC';
  const studentTzName = studentTz.replace(/_/g, ' ');
  const student = { id, full_name: p.full_name, timezone: p.timezone, credits };

  const book = () => openModal('Book a lesson', <BookForStudent student={student} onDone={load} />);
  const adjust = () => openModal('Adjust credits', <AdjustCredits student={{ id, full_name: p.full_name, credits }} onDone={load} />);

  const summary = [
    { k: 'credits', icon: 'credits', num: credits, label: 'Credits left', bad: credits <= 0, to: 'credits' },
    { k: 'upcoming', icon: 'calendar', num: upcoming.length, label: 'Upcoming lessons', to: 'lessons' },
    { k: 'done', icon: 'lessons', num: completed.length, label: 'Lessons completed', to: 'lessons' },
    { k: 'files', icon: 'files', num: resources.length, label: 'Files shared', to: 'files' },
  ];

  const lessonRow = (b, isPast) => (
    <div key={b.id} className="hw-item" style={{ flexWrap: 'wrap' }}>
      <div className="date-tile is-small" aria-hidden="true"><span>{new Date(b.starts_at).toLocaleDateString(undefined, { timeZone: tz, month: 'short' })}</span><strong>{new Date(b.starts_at).toLocaleDateString(undefined, { timeZone: tz, day: 'numeric' })}</strong></div>
      <div className="hw-info" style={{ flex: 1, minWidth: 180 }}>
        <strong>{longDateIn(tz, new Date(b.starts_at))} · {timeIn(tz, new Date(b.starts_at))}</strong>
        <span>{b.subject}{!isPast && ` · for ${first}: ${shortDateIn(studentTz, new Date(b.starts_at))} ${timeIn(studentTz, new Date(b.starts_at))}`}</span>
        {notes[b.id]?.summary && <div className="profile-note"><Icon name="notes" /><span>{notes[b.id].summary}</span></div>}
        {notes[b.id]?.homework && <div className="profile-note"><Icon name="books" /><span><b>Homework:</b> {notes[b.id].homework}</span></div>}
      </div>
      {isPast
        ? <span className={`chip ${b.status === 'cancelled' ? 'chip-red' : 'chip-blue'}`}>{b.status === 'cancelled' ? 'Cancelled' : 'Done'}</span>
        : b.meet_url && <a className="btn btn-primary btn-sm" href={b.meet_url} target="_blank" rel="noreferrer"><Icon name="video" weight="fill" /> Join</a>}
    </div>
  );

  return (
    <>
      <DashHeader title="Student">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/admin-students')}><Icon name="back" /> All students</button>
      </DashHeader>
      <div className="dash-main">
        <section className="card profile-head" aria-label="Student">
          <PersonAvatar className="avatar profile-avatar" avatar={av[p.id]?.avatar} lessons={av[p.id]?.lessons} initials={initials(p.full_name || p.email)} />
          <div className="profile-id">
            <h2>{p.full_name || '(no name)'} {p.english_level && <span className="chip chip-green" title="English level">{p.english_level}</span>}</h2>
            <p className="profile-meta">
              <span><Icon name="mail" /> {p.email}</span>
              <span><Icon name="globe" /> {p.country || 'Country not set'}</span>
              <span><Icon name="clock" /> {timeIn(studentTz, new Date())} there ({studentTzName})</span>
              <span><Icon name="user" /> Joined {new Date(p.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </p>
          </div>
          <div className="profile-actions">
            <button className="btn btn-primary btn-sm" onClick={book}><Icon name="calendar" /> Book a lesson</button>
            <button className="btn btn-outline btn-sm" onClick={() => setTab('chat')}><Icon name="chat" /> Message</button>
            <button className="btn btn-outline btn-sm" onClick={adjust}><Icon name="credits" /> Adjust credits</button>
          </div>
        </section>

        <div className="dash-grid-4 profile-summary">
          {summary.map(s => (
            <button key={s.k} type="button" className="stat-card" onClick={() => setTab(s.to)}>
              <div className="stat-icon" style={{ background: 'var(--soft-pink)' }}><Icon name={s.icon} /></div>
              <div className="stat-num" style={{ color: s.bad ? 'var(--red)' : undefined }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="tabs profile-tabs" role="tablist" aria-label="Student sections">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="profile-panel" key={tab}>
          {tab === 'overview' && (
            <div className="profile-grid">
              <div className="card card-pad">
                <div className="card-header">
                  <span className="card-title"><Icon name="calendar" /> Next lesson</span>
                  {upcoming.length > 1 && <button className="card-link" onClick={() => setTab('lessons')}>All {upcoming.length} upcoming →</button>}
                </div>
                {next ? (
                  <div className="lesson-hero" style={{ marginBottom: 0 }}>
                    <div className="lesson-hero-time" style={{ fontSize: '1.5rem' }}>{timeIn(tz, new Date(next.starts_at))}</div>
                    <div className="lesson-hero-when">{longDateIn(tz, new Date(next.starts_at))}</div>
                    <div style={{ fontSize: '.84rem', opacity: .85, margin: '6px 0 0' }}>{next.subject} · for {first}: {shortDateIn(studentTz, new Date(next.starts_at))} {timeIn(studentTz, new Date(next.starts_at))} ({studentTzName})</div>
                    {next.meet_url && <a className="join-btn" style={{ marginTop: 12 }} href={next.meet_url} target="_blank" rel="noreferrer"><Icon name="video" weight="fill" /> Join</a>}
                  </div>
                ) : (
                  <EmptyState compact title="No lesson booked" action={<button className="btn btn-primary btn-sm" onClick={book}>Book a lesson</button>}>Book one for {first} once they have agreed a time.</EmptyState>
                )}
              </div>

              <div className="card card-pad">
                <div className="card-title" style={{ marginBottom: 10 }}><Icon name="target" /> Level & plan</div>
                <Field label="English level (you decide)">
                  {fid => (
                    <select id={fid} value={level} onChange={e => setLevel(e.target.value)} style={{ maxWidth: 200 }}>
                      <option value="">Not assessed yet</option>
                      {LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Plan for the next lesson (the student can see this)">
                  {fid => <textarea id={fid} rows={3} maxLength={1000} value={focus} onChange={e => setFocus(e.target.value)} placeholder="e.g. Practise past tenses; bring your essay draft…" />}
                </Field>
                <button className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
              </div>

              <div className="card card-pad profile-wide">
                <div className="card-header">
                  <span className="card-title"><Icon name="notes" /> Latest lesson notes</span>
                  {past.length > 0 && <button className="card-link" onClick={() => setTab('lessons')}>Lesson history →</button>}
                </div>
                {lastWithNotes ? lessonRow(lastWithNotes, true) : <p className="fine-print" style={{ margin: 0 }}>No lesson notes yet. Notes you add after a lesson appear here.</p>}
              </div>
            </div>
          )}

          {tab === 'lessons' && (
            <div className="profile-stack">
              <div className="card card-pad">
                <div className="card-header">
                  <span className="card-title"><Icon name="calendar" /> Upcoming ({upcoming.length})</span>
                  <button className="btn btn-outline btn-sm" onClick={book}><Icon name="calendar" /> Book a lesson</button>
                </div>
                {upcoming.length === 0 ? <p className="fine-print" style={{ margin: 0 }}>Nothing booked.</p> : upcoming.map(b => lessonRow(b, false))}
                <p className="fine-print">Your times are in {tz.replace(/_/g, ' ')}.</p>
              </div>
              <div className="card card-pad">
                <div className="card-title" style={{ marginBottom: 6 }}><Icon name="lessons" /> History ({past.length})</div>
                {past.length === 0 ? <p className="fine-print" style={{ margin: 0 }}>No past lessons yet.</p> : (showAllPast ? past : past.slice(0, PAGE)).map(b => lessonRow(b, true))}
                {past.length > PAGE && !showAllPast && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowAllPast(true)}>Show all {past.length}</button>}
              </div>
            </div>
          )}

          {tab === 'chat' && (
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="chat" /> Chat with {first}</span>
                <button className="card-link" onClick={() => navigate(`/dashboard/admin-messages/${id}`)}>Open in Messages →</button>
              </div>
              <ChatThread studentId={id} otherName={p.full_name} compact />
            </div>
          )}

          {tab === 'credits' && (
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="credits" /> {credits} credit{credits === 1 ? '' : 's'} left</span>
                <button className="btn btn-outline btn-sm" onClick={adjust}>Adjust credits</button>
              </div>
              {ledger.length === 0 ? <p className="fine-print" style={{ margin: 0 }}>No credit activity yet.</p> : (showAllLedger ? ledger : ledger.slice(0, PAGE)).map(x => (
                <div key={x.id} className="hw-item">
                  <div className="hw-info"><strong>{REASONS[x.reason]}</strong><span>{new Date(x.created_at).toLocaleDateString()}{x.note ? ` · ${x.note}` : ''}</span></div>
                  <strong style={{ color: x.delta > 0 ? 'var(--sage-dark)' : 'var(--ink-soft)' }}>{x.delta > 0 ? '+' : ''}{x.delta}</strong>
                </div>
              ))}
              {ledger.length > PAGE && !showAllLedger && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowAllLedger(true)}>Show all {ledger.length}</button>}
            </div>
          )}

          {tab === 'files' && (
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 4 }}><Icon name="files" /> Files with {first} ({resources.length})</div>
              <p className="fine-print" style={{ margin: '0 0 12px' }}>Private between you and this student.</p>
              <UploadForm studentId={id} onDone={load} label="Send to student" />
              <FileList items={resources} who={r => r.uploader_id === id ? 'From student' : 'Sent by you'} canDelete={() => true} onChange={load} empty="No files yet." />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
