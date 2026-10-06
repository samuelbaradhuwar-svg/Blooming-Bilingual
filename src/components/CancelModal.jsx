import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export default function CancelModal({ booking, refundable, windowHours, onDone }) {
  const { showToast, closeModal, refreshCredits } = useApp();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('cancel_booking', { p_booking_id: booking.id });
    setBusy(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(data ? 'Lesson cancelled — 1 credit refunded.' : 'Lesson cancelled.', 'success');
    closeModal();
    refreshCredits();
    onDone();
  };

  return (
    <div>
      <p style={{ fontSize: '.9rem', color: 'var(--ink-soft)', marginBottom: 14 }}>
        Cancel <strong>{booking.subject}</strong>?
      </p>
      <div style={{ background: refundable ? 'var(--green-bg)' : 'var(--orange-bg)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '.84rem', marginBottom: 18 }}>
        {refundable
          ? '✅ You are more than ' + windowHours + ' hours ahead, so your credit will be refunded.'
          : '⚠️ This is within ' + windowHours + ' hours of the lesson, so your credit will NOT be refunded.'}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost btn-full" onClick={closeModal}>Keep lesson</button>
        <button className="btn btn-primary btn-full" disabled={busy} onClick={confirm}>{busy ? 'Cancelling…' : 'Yes, cancel'}</button>
      </div>
    </div>
  );
}
