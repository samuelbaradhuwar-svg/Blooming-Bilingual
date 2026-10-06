import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { longDateIn, timeIn } from '../../../lib/time';

const LEVELS = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function NotesForm({ booking, existing, onDone }) {
  const { showToast, closeModal } = useApp();
  const [f, setF] = useState({
    summary: existing?.summary || '', homework: existing?.homework || '', level: existing?.level || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('lesson_notes').upsert({
      booking_id: booking.id, student_id: booking.student_id,
      summary: f.summary || null, homework: f.homework || null, level: f.level || null,
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
      <div className="form-group"><label>What you covered</label><textarea rows={3} value={f.summary} onChange={set('summary')} /></div>
      <div className="form-group"><label>Homework</label><textarea rows={2} value={f.homework} onChange={set('homework')} /></div>
      <div className="form-group"><label>Level (optional)</label>
        <select value={f.level} onChange={set('level')}>{LEVELS.map(l => <option key={l} value={l}>{l || '—'}</option>)}</select>
      </div>
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
      supabase.from('bookings').select('id, student_id, starts_at, ends_at, subject, status, profiles(full_name)')
        .in('status', ['confirmed', 'completed']).lt('ends_at', new Date().toISOString()).order('starts_at', { ascending: false }),
      supabase.from('lesson_notes').select('booking_id, summary, homework, level'),
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
          {notes[b.id]?.summary && <span>📝 {notes[b.id].summary}</span>}
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
        {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : (
          <>
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>To wrap up ({todo.length})</div>
              {todo.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>All caught up ✨</p> : todo.map(b => <Row key={b.id} b={b} />)}
            </div>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 8 }}>Completed ({done.length})</div>
              {done.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No completed lessons yet.</p> : done.map(b => <Row key={b.id} b={b} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
