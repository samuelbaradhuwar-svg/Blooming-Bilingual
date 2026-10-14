import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import DashHeader from '../../../components/dashboard/DashHeader';
import RescheduleModal from '../../../components/RescheduleModal';
import CancelModal from '../../../components/CancelModal';
import Icon from '../../../components/ui/Icon';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { longDateIn, timeIn } from '../../../lib/time';

const DEFAULT_WINDOW_HOURS = 2;

const EMPTY = {
  upcoming: ['No upcoming lessons', 'Book a time that suits you and your Google Meet link arrives straight away.'],
  completed: ['No completed lessons yet', 'Lessons you have taken will appear here, with Neeliën’s notes in My Progress.'],
  cancelled: ['No cancelled lessons', 'Lessons you cancel or move will be listed here.'],
};

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
  const all = bookings || [];
  const groups = {
    upcoming: all.filter(isUpcoming),
    completed: all.filter(b => b.status !== 'cancelled' && !isUpcoming(b)).reverse(),
    cancelled: all.filter(b => b.status === 'cancelled').reverse(),
  };
  const shown = groups[tab];

  const hoursAway = (b) => (new Date(b.starts_at).getTime() - now) / 36e5;
  const canChange = (b) => hoursAway(b) > windowHours;

  const statusOf = (b) => {
    if (b.status === 'cancelled') return { label: 'Cancelled', cls: 'chip-red' };
    if (isUpcoming(b)) return { label: 'Confirmed', cls: 'chip-green' };
    return { label: 'Completed', cls: 'chip-blue' };
  };

  return (
    <>
      <DashHeader title="My Lessons">
        <button className="btn btn-primary btn-sm" onClick={() => onSwitch('booking')}><Icon name="calendar" /> Book a lesson</button>
      </DashHeader>
      <div className="dash-main">
        <div className="tabs" role="tablist" aria-label="Lesson status">
          {[['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {label}<span className="tab-count">{bookings ? groups[k].length : '–'}</span>
            </button>
          ))}
        </div>
        <p className="fine-print" style={{ margin: '0 0 12px' }}>
          <Icon name="globe" /> Times shown in <strong>{tz.replace(/_/g, ' ')}</strong>
        </p>

        {bookings === null ? <SkeletonRows rows={3} h={84} /> : shown.length === 0 ? (
          <div className="card card-pad">
            <EmptyState title={EMPTY[tab][0]} action={tab !== 'cancelled' && <button className="btn btn-primary btn-sm" onClick={() => onSwitch('booking')}>Book a lesson</button>}>
              {EMPTY[tab][1]}
            </EmptyState>
          </div>
        ) : (
          <ul className="lesson-list" role="tabpanel">
            {shown.map(b => {
              const start = new Date(b.starts_at);
              const st = statusOf(b);
              const month = start.toLocaleDateString(undefined, { timeZone: tz, month: 'short' });
              const day = start.toLocaleDateString(undefined, { timeZone: tz, day: 'numeric' });
              return (
                <li key={b.id} className="lesson-item">
                  <div className="date-tile" aria-hidden="true"><span>{month}</span><strong>{day}</strong></div>
                  <div className="lesson-main">
                    <div className="lesson-title">{longDateIn(tz, start)}</div>
                    <div className="lesson-sub"><Icon name="clock" /> {timeIn(tz, start)} · 45 min · {b.subject}</div>
                  </div>
                  <span className={`chip ${st.cls}`}>{st.label}</span>
                  {isUpcoming(b) && (
                    <div className="lesson-actions">
                      {b.meet_url && <a className="btn btn-primary btn-sm" href={b.meet_url} target="_blank" rel="noreferrer"><Icon name="video" weight="fill" /> Join</a>}
                      <button className="btn btn-ghost btn-sm" disabled={!canChange(b)}
                        title={canChange(b) ? '' : `Lessons can be moved up to ${windowHours} hours before`}
                        onClick={() => openModal('Reschedule lesson', <RescheduleModal booking={b} onDone={load} />)}>Reschedule</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => openModal('Cancel lesson', <CancelModal booking={b} refundable={canChange(b)} windowHours={windowHours} onDone={load} />)}>Cancel</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="fine-print" style={{ marginTop: 14 }}>
          Cancel or reschedule more than {windowHours} hours ahead and your credit is kept or refunded.
        </p>
      </div>
    </>
  );
}
