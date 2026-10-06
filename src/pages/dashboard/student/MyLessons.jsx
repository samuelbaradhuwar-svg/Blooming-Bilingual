import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import DashHeader from '../../../components/dashboard/DashHeader';
import RescheduleModal from '../../../components/RescheduleModal';
import CancelModal from '../../../components/CancelModal';
import { longDateIn, timeIn } from '../../../lib/time';

const DEFAULT_WINDOW_HOURS = 2;

export default function MyLessons({ onSwitch }) {
  const { currentUser, openModal, showToast } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [bookings, setBookings] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [windowHours, setWindowHours] = useState(DEFAULT_WINDOW_HOURS);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings').select('id, starts_at, ends_at, subject, status, meet_url')
      .order('starts_at', { ascending: true });
    if (error) { showToast('Could not load your lessons.', 'error'); setBookings([]); return; }
    setBookings(data);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'cancel_window_hours').single()
      .then(({ data }) => { if (data) setWindowHours(Number(data.value)); });
  }, []);

  const now = Date.now();
  const isUpcoming = (b) => b.status === 'confirmed' && new Date(b.ends_at).getTime() > now;
  const upcoming = (bookings || []).filter(isUpcoming);
  const past = (bookings || []).filter(b => !isUpcoming(b)).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  const hoursAway = (b) => (new Date(b.starts_at).getTime() - now) / 36e5;
  const canChange = (b) => hoursAway(b) > windowHours;

  const statusOf = (b) => {
    if (b.status === 'cancelled') return { label: 'Cancelled', bg: 'var(--red-bg)', color: 'var(--red)' };
    if (isUpcoming(b)) return { label: 'Confirmed', bg: 'var(--green-bg)', color: '#15803d' };
    return { label: 'Completed', bg: 'var(--off-white)', color: 'var(--ink-muted)' };
  };

  return (
    <>
      <DashHeader title="My Lessons">
        <button className="btn btn-primary btn-sm" onClick={() => onSwitch('booking')}>📅 Book a lesson</button>
      </DashHeader>
      <div className="dash-main">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['upcoming', `Upcoming (${upcoming.length})`], ['past', `Past (${past.length})`]].map(([k, label]) => (
            <button key={k} className={`btn btn-sm ${tab === k ? 'btn-outline' : 'btn-ghost'}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--ink-muted)', marginBottom: 12 }}>
          🌍 Times shown in <strong>{tz.replace(/_/g, ' ')}</strong>
        </p>

        <div className="card card-pad">
          {bookings === null ? (
            <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Loading…</p>
          ) : shown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{tab === 'upcoming' ? '📅' : '🎓'}</div>
              <p style={{ fontSize: '.9rem', color: 'var(--ink-soft)', marginBottom: 12 }}>
                {tab === 'upcoming' ? 'No upcoming lessons yet.' : 'No past lessons yet.'}
              </p>
              {tab === 'upcoming' && <button className="btn btn-primary btn-sm" onClick={() => onSwitch('booking')}>Book your first lesson</button>}
            </div>
          ) : shown.map(b => {
            const start = new Date(b.starts_at);
            const st = statusOf(b);
            return (
              <div key={b.id} className="hw-item" style={{ flexWrap: 'wrap' }}>
                <div className="hw-info" style={{ flex: 1, minWidth: 180 }}>
                  <strong>{longDateIn(tz, start)} · {timeIn(tz, start)}</strong>
                  <span>{b.subject} · 45 min</span>
                </div>
                <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 50, background: st.bg, color: st.color }}>{st.label}</span>
                {isUpcoming(b) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {b.meet_url && <a className="btn btn-primary btn-sm" href={b.meet_url} target="_blank" rel="noreferrer">🎥 Join</a>}
                    <button className="btn btn-ghost btn-sm" disabled={!canChange(b)}
                      title={canChange(b) ? '' : `Lessons can be moved up to ${windowHours} hours before`}
                      onClick={() => openModal('Reschedule lesson', <RescheduleModal booking={b} onDone={load} />)}>Reschedule</button>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => openModal('Cancel lesson', <CancelModal booking={b} refundable={canChange(b)} windowHours={windowHours} onDone={load} />)}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '.76rem', color: 'var(--ink-muted)', marginTop: 12 }}>
          Cancel or reschedule more than {windowHours} hours ahead and your credit is kept or refunded.
        </p>
      </div>
    </>
  );
}
