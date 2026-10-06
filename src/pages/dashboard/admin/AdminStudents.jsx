import { useCallback, useEffect, useMemo, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { shortDateIn, timeIn } from '../../../lib/time';

function AdjustCredits({ student, onDone }) {
  const { showToast, closeModal } = useApp();
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const n = parseInt(delta, 10);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_adjust_credits', { p_student: student.id, p_delta: n, p_note: note || null });
    setBusy(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`${n > 0 ? '+' : ''}${n} credits for ${student.full_name}.`, 'success');
    closeModal(); onDone();
  };

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)', marginBottom: 14 }}>
        {student.full_name} currently has <strong>{student.credits}</strong> credits. Use a negative number to remove credits.
      </p>
      <div className="form-group"><label>Change by</label><input type="number" value={delta} onChange={e => setDelta(e.target.value)} placeholder="e.g. 4 or -1" /></div>
      <div className="form-group"><label>Reason (kept in their history)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Paid by bank transfer" /></div>
      <button className="btn btn-primary btn-full" disabled={busy || !n} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

export default function AdminStudents() {
  const { currentUser, openModal, showToast } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_student_overview');
    if (error) { showToast('Could not load students.', 'error'); setRows([]); return; }
    setRows(data);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows || []).filter(r => !s || `${r.full_name} ${r.email} ${r.country || ''}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <>
      <DashHeader title="Students" />
      <div className="dash-main">
        <div className="form-group" style={{ maxWidth: 360 }}>
          <input placeholder="Search by name, email or country" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="card card-pad">
          {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : shown.length === 0 ? (
            <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>{rows.length ? 'No matches.' : 'No students have signed up yet.'}</p>
          ) : shown.map(r => (
            <div key={r.id} className="hw-item" style={{ flexWrap: 'wrap' }}>
              <div className="hw-info" style={{ flex: 1, minWidth: 200 }}>
                <strong>{r.full_name || '(no name)'}</strong>
                <span>{r.email} · {r.country || 'Country not set'} · {(r.timezone || '').replace(/_/g, ' ')}</span>
                <span>
                  {r.lessons_booked} lesson{r.lessons_booked === 1 ? '' : 's'}
                  {r.next_lesson && ` · next ${shortDateIn(tz, new Date(r.next_lesson))} ${timeIn(tz, new Date(r.next_lesson))}`}
                </span>
              </div>
              <div style={{ textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', fontWeight: 700, color: r.credits > 0 ? 'var(--navy)' : 'var(--red)' }}>{r.credits}</div>
                <div style={{ fontSize: '.66rem', color: 'var(--ink-muted)' }}>credits</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => openModal('Adjust credits', <AdjustCredits student={r} onDone={load} />)}>Adjust</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
