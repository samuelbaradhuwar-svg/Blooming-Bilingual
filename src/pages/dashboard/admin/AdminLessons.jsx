import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { longDateIn, timeIn } from '../../../lib/time';
import { SKILLS } from '../student/StudentProgress';
import Icon from '../../../components/ui/Icon';
import Field from '../../../components/ui/Field';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonRows } from '../../../components/ui/Skeleton';

const LEVELS = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function NotesForm({ booking, existing, onDone }) {
  const { showToast, closeModal } = useApp();
  const [f, setF] = useState({
    summary: existing?.summary || '', homework: existing?.homework || '', level: existing?.level || '',
    ...Object.fromEntries(SKILLS.map(([k]) => [k, existing?.scores?.[k] ?? ''])),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    // Skill scores are optional: keep only the ones filled in, as whole numbers from 0 to 100.
    const scores = {};
    for (const [k] of SKILLS) {
      if (f[k] === '' || f[k] == null) continue;
      const n = Math.round(Number(f[k]));
      if (Number.isNaN(n) || n < 0 || n > 100) { showToast('Skill scores must be between 0 and 100.', 'error'); return; }
      scores[k] = n;
    }
    setBusy(true);
    const { error } = await supabase.from('lesson_notes').upsert({
      booking_id: booking.id, student_id: booking.student_id,
      summary: f.summary || null, homework: f.homework || null, level: f.level || null,
      scores: Object.keys(scores).length ? scores : null,
    }, { onConflict: 'booking_id' });
    if (error) { setBusy(false); showToast(error.message, 'error'); return; }
    if (booking.status === 'confirmed') {
      const { error: e2 } = await supabase.rpc('admin_complete_booking', { p_booking_id: booking.id });
      if (e2) { setBusy(false); showToast(e2.message, 'error'); return; }
    }
    setBusy(false);
    showToast('Lesson notes saved.', 'success'); closeModal(); onDone();
  };

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)', marginBottom: 12 }}>{booking.profiles?.full_name} · {booking.subject}</p>
      <Field label="What you covered">{id => <textarea id={id} rows={3} value={f.summary} onChange={set('summary')} />}</Field>
      <Field label="Homework">{id => <textarea id={id} rows={2} value={f.homework} onChange={set('homework')} />}</Field>
      <Field label="Level (optional)">
        {id => <select id={id} value={f.level} onChange={set('level')}>{LEVELS.map(l => <option key={l} value={l}>{l || '—'}</option>)}</select>}
      </Field>
      <fieldset className="form-group" style={{ border: 'none', padding: 0, minWidth: 0 }}>
        <legend style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Skill scores, 0–100 (optional). The student sees the latest ones.</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {SKILLS.map(([k, label]) => (
            <input key={k} name={k} type="number" min="0" max="100" inputMode="numeric" placeholder={label} aria-label={label} value={f[k]} onChange={set(k)} />
          ))}
        </div>
      </fieldset>
      <button className="btn btn-primary btn-full" disabled={busy} onClick={save}>{busy ? 'Saving…' : booking.status === 'confirmed' ? 'Save & mark completed' : 'Save notes'}</button>
    </div>
  );
}

export default function AdminLessons() {
  const { currentUser, openModal, showToast } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [rows, setRows] = useState(null);
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    const [b, n] = await Promise.all([
      supabase.from('bookings').select('id, student_id, starts_at, ends_at, subject, status, profiles!bookings_student_id_fkey(full_name)')
        .in('status', ['confirmed', 'completed']).lt('ends_at', new Date().toISOString()).order('starts_at', { ascending: false }),
      supabase.from('lesson_notes').select('booking_id, summary, homework, level, scores'),
    ]);
    if (b.error) { showToast('Could not load lessons.', 'error'); setRows([]); return; }
    setRows(b.data);
    setNotes(Object.fromEntries((n.data || []).map(x => [x.booking_id, x])));
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const todo = (rows || []).filter(b => b.status === 'confirmed');
  const done = (rows || []).filter(b => b.status === 'completed');

  const Row = ({ b }) => {
    const start = new Date(b.starts_at);
    return (
      <div className="hw-item" style={{ flexWrap: 'wrap' }}>
        <div className="hw-info" style={{ flex: 1, minWidth: 200 }}>
          <strong>{b.profiles?.full_name || 'Student'} · {b.subject}</strong>
          <span>{longDateIn(tz, start)} · {timeIn(tz, start)}</span>
          {notes[b.id]?.summary && <span><Icon name="notes" /> {notes[b.id].summary}</span>}
        </div>
        <button className={`btn btn-sm ${b.status === 'confirmed' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => openModal('Lesson notes', <NotesForm booking={b} existing={notes[b.id]} onDone={load} />)}>
          {b.status === 'confirmed' ? 'Wrap up' : notes[b.id] ? 'Edit notes' : 'Add notes'}
        </button>
      </div>
    );
  };

  return (
    <>
      <DashHeader title="Lessons" />
      <div className="dash-main">
        {rows === null ? <SkeletonRows rows={3} h={64} /> : (
          <>
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>To wrap up ({todo.length})</div>
              {todo.length === 0 ? <EmptyState compact title="All caught up">Lessons that have finished and need notes will appear here.</EmptyState> : todo.map(b => <Row key={b.id} b={b} />)}
            </div>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 8 }}>Completed ({done.length})</div>
              {done.length === 0 ? <EmptyState compact title="No completed lessons yet">Wrap up a lesson to see it here.</EmptyState> : done.map(b => <Row key={b.id} b={b} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
