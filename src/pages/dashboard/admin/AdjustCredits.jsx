import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import Field from '../../../components/ui/Field';

export default function AdjustCredits({ student, onDone }) {
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
      <Field label="Change by">{id => <input id={id} type="number" inputMode="numeric" value={delta} onChange={e => setDelta(e.target.value)} placeholder="e.g. 4 or -1" />}</Field>
      <Field label="Reason (kept in their history)">{id => <input id={id} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Paid by bank transfer…" autoComplete="off" />}</Field>
      <button className="btn btn-primary btn-full" disabled={busy || !n} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}
