import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { longDateIn, timeIn } from '../../../lib/time';

function MeetLink({ booking, onDone }) {
  const { showToast, closeModal } = useApp();
  const [url, setUrl] = useState(booking.meet_url || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_set_meet_url', { p_booking_id: booking.id, p_url: url });
    setBusy(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Meet link saved.', 'success'); closeModal(); onDone();
  };
  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)', marginBottom: 12 }}>
        Paste the Google Meet (or Zoom) link for this lesson. {booking.profiles?.full_name} will see a Join button.
      </p>
      <div className="form-group"><label>Meeting link</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://meet.google.com/…" /></div>
      <button className="btn btn-primary btn-full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save link'}</button>
    </div>
  );
}

function CancelByTutor({ booking, onDone }) {
  const { showToast, closeModal } = useApp();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: booking.id });
    setBusy(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Lesson cancelled and the credit refunded.', 'success'); closeModal(); onDone();
  };
  return (
    <div>
      <p style={{ fontSize: '.88rem', color: 'var(--ink-soft)', marginBottom: 14 }}>
        Cancel {booking.profiles?.full_name}'s lesson? Their credit is always refunded when you cancel.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost btn-full" onClick={closeModal}>Keep it</button>
        <button className="btn btn-primary btn-full" disabled={busy} onClick={go}>{busy ? 'Cancelling…' : 'Cancel lesson'}</button>
      </div>
    </div>
  );
}

export default function AdminBookings() {
  const { currentUser, openModal, showToast } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('upcoming');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('bookings')
      .select('id, starts_at, ends_at, subject, status, meet_url, profiles(full_name, email)')
      .order('starts_at', { ascending: true });
    if (error) { showToast('Could not load bookings.', 'error'); setRows([]); return; }
    setRows(data);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const upcoming = (rows || []).filter(b => b.status === 'confirmed' && new Date(b.ends_at).getTime() > now);
  const past = (rows || []).filter(b => !upcoming.includes(b)).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  return (
    <>
      <DashHeader title="Bookings" />
      <div className="dash-main">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['upcoming', `Upcoming (${upcoming.length})`], ['past', `Past (${past.length})`]].map(([k, l]) => (
            <button key={k} className={`btn btn-sm ${tab === k ? 'btn-outline' : 'btn-ghost'}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--ink-muted)', marginBottom: 12 }}>Times shown in {tz.replace(/_/g, ' ')}</p>
        <div className="card card-pad">
          {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : shown.length === 0 ? (
            <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Nothing here yet.</p>
          ) : shown.map(b => {
            const start = new Date(b.starts_at);
            const live = upcoming.includes(b);
            return (
              <div key={b.id} className="hw-item" style={{ flexWrap: 'wrap' }}>
                <div className="hw-info" style={{ flex: 1, minWidth: 200 }}>
                  <strong>{longDateIn(tz, start)} · {timeIn(tz, start)}</strong>
                  <span>{b.profiles?.full_name || 'Student'} · {b.subject}</span>
                  {b.meet_url && <span>🎥 <a href={b.meet_url} target="_blank" rel="noreferrer">{b.meet_url}</a></span>}
                </div>
                <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 50, background: b.status === 'cancelled' ? 'var(--red-bg)' : live ? 'var(--green-bg)' : 'var(--off-white)', color: b.status === 'cancelled' ? 'var(--red)' : live ? '#15803d' : 'var(--ink-muted)' }}>
                  {b.status === 'cancelled' ? 'Cancelled' : live ? 'Confirmed' : 'Completed'}
                </span>
                {live && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openModal('Meeting link', <MeetLink booking={b} onDone={load} />)}>🎥 {b.meet_url ? 'Edit link' : 'Add link'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openModal('Cancel lesson', <CancelByTutor booking={b} onDone={load} />)}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
