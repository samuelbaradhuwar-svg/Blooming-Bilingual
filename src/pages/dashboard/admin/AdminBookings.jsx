import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { longDateIn, timeIn } from '../../../lib/time';
import Icon from '../../../components/ui/Icon';
import Field from '../../../components/ui/Field';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonRows } from '../../../components/ui/Skeleton';

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
      <Field label="Meeting link">{id => <input id={id} type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://meet.google.com/…" autoComplete="off" spellCheck={false} />}</Field>
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
        <div className="tabs" role="tablist" aria-label="Booking status">
          {[['upcoming', 'Upcoming', upcoming.length], ['past', 'Past', past.length]].map(([k, l, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}<span className="tab-count">{rows ? n : '–'}</span></button>
          ))}
        </div>
        <p className="fine-print" style={{ margin: '0 0 12px' }}><Icon name="globe" /> Times shown in {tz.replace(/_/g, ' ')}</p>
        {rows === null ? <SkeletonRows rows={3} h={84} /> : shown.length === 0 ? (
          <div className="card card-pad"><EmptyState compact title="Nothing here yet">{tab === 'upcoming' ? 'New bookings appear here as students book.' : 'Finished and cancelled lessons are listed here.'}</EmptyState></div>
        ) : (
          <ul className="lesson-list">
            {shown.map(b => {
              const start = new Date(b.starts_at);
              const live = upcoming.includes(b);
              const cls = b.status === 'cancelled' ? 'chip-red' : live ? 'chip-green' : 'chip-blue';
              return (
                <li key={b.id} className="lesson-item">
                  <div className="date-tile" aria-hidden="true"><span>{start.toLocaleDateString(undefined, { timeZone: tz, month: 'short' })}</span><strong>{start.toLocaleDateString(undefined, { timeZone: tz, day: 'numeric' })}</strong></div>
                  <div className="lesson-main">
                    <div className="lesson-title">{b.profiles?.full_name || 'Student'}</div>
                    <div className="lesson-sub"><Icon name="clock" /> {longDateIn(tz, start)} · {timeIn(tz, start)} · {b.subject}</div>
                    {b.meet_url && <div className="lesson-sub"><Icon name="video" /> <a href={b.meet_url} target="_blank" rel="noreferrer">{b.meet_url}</a></div>}
                  </div>
                  <span className={`chip ${cls}`}>{b.status === 'cancelled' ? 'Cancelled' : live ? 'Confirmed' : 'Completed'}</span>
                  {live && (
                    <div className="lesson-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openModal('Meeting link', <MeetLink booking={b} onDone={load} />)}><Icon name="video" /> {b.meet_url ? 'Edit link' : 'Add link'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openModal('Cancel lesson', <CancelByTutor booking={b} onDone={load} />)}>Cancel</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
