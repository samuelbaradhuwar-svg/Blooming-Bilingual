import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { getGreeting, formatMoney } from '../../../data/constants';
import { dateKeyIn, timeIn, shortDateIn } from '../../../lib/time';
import Icon from '../../../components/ui/Icon';
import Hibiscus from '../../../components/ui/Hibiscus';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton, { SkeletonRows } from '../../../components/ui/Skeleton';
import BookForStudent from '../../../components/BookForStudent';

// The last six calendar months, oldest first, each with the revenue from paid orders.
function monthlyRevenue(orders) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), cents: 0 };
  });
  for (const o of orders) {
    const d = new Date(o.paid_at);
    const m = months.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.cents += o.amount_cents;
  }
  return months;
}

export default function AdminHome({ onSwitch }) {
  const { currentUser, showToast, openModal } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [data, setData] = useState(null);
  const [sync, setSync] = useState(null);   // calendar health, so a problem is seen the moment she opens her dashboard

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
      const [students, upcoming, needsNotes, orders] = await Promise.all([
        supabase.rpc('admin_student_overview'),
        supabase.from('bookings').select('id, starts_at, subject, profiles!bookings_student_id_fkey(full_name)')
          .eq('status', 'confirmed').gt('ends_at', new Date().toISOString()).order('starts_at').limit(50),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('status', 'confirmed').lt('ends_at', new Date().toISOString()),
        supabase.from('orders').select('amount_cents, paid_at').eq('status', 'paid').gte('paid_at', since.toISOString()),
      ]);
      if (students.error || upcoming.error) { showToast('Could not load the dashboard.', 'error'); return; }
      setData({
        students: students.data,
        upcoming: upcoming.data,
        toReview: needsNotes.count ?? 0,
        months: monthlyRevenue(orders.data || []),
      });
    })();
  }, [showToast]);

  useEffect(() => {
    supabase.rpc('admin_calendar_overview').then(({ data: o, error }) => { if (!error) setSync(o); });
  }, []);

  const today = dateKeyIn(tz, new Date());
  const todays = (data?.upcoming || []).filter(b => dateKeyIn(tz, new Date(b.starts_at)) === today);
  const first = currentUser?.name?.split(' ')[0] ?? '';
  const thisMonth = data?.months[data.months.length - 1];
  const max = Math.max(1, ...(data?.months || []).map(m => m.cents));

  const stats = [
    { icon: 'students', bg: 'var(--soft-pink)', num: data?.students.length, label: 'Total students', go: 'admin-students' },
    { icon: 'money', bg: 'var(--green-bg)', num: data && formatMoney(thisMonth.cents), label: `Revenue · ${new Date().toLocaleDateString(undefined, { month: 'long' })}`, go: 'admin-billing' },
    { icon: 'calendar', bg: '#F3E6EE', num: data && todays.length, label: 'Lessons today', go: 'admin-bookings' },
    { icon: 'notes', bg: 'var(--orange-bg)', num: data?.toReview, label: 'Lessons to wrap up', go: 'admin-lessons' },
  ];
  const actions = [
    { icon: 'calendar', label: 'Book a lesson for a student', run: () => openModal('Book a lesson for a student', <BookForStudent />) },
    { icon: 'students', label: 'View students', go: 'admin-students' },
    { icon: 'calendar', label: 'View bookings', go: 'admin-bookings' },
    { icon: 'mail', label: 'Open messages', go: 'admin-messages' },
    { icon: 'clock', label: 'Edit hours & leave', go: 'admin-settings' },
  ];

  return (
    <>
      <DashHeader title="Dashboard" />
      <div className="dash-main">
        <section className="welcome" aria-label="Welcome">
          <Hibiscus variant="silhouette" className="welcome-flower" />
          <h2 className="welcome-title">{getGreeting()}, {first}</h2>
          <p>{data ? (todays.length ? `You have ${todays.length} lesson${todays.length > 1 ? 's' : ''} today.` : 'No lessons today. Enjoy the quiet.') : 'Loading your day…'}</p>
        </section>

        {sync && (sync.health === 'down' || sync.health === 'warning' || sync.open_conflicts > 0 || sync.failed_writes > 0) && (
          <button type="button" className={`sync-banner is-${sync.health === 'down' || sync.open_conflicts > 0 ? 'bad' : 'warn'}`} onClick={() => onSwitch('admin-calendar')}>
            <Icon name="warning" weight="fill" className="sync-banner-icon" />
            <div>
              <strong>{sync.health === 'down' ? 'Booking is paused: your calendar could not be checked' : sync.open_conflicts > 0 ? `${sync.open_conflicts} double booking${sync.open_conflicts > 1 ? 's' : ''} to sort out` : sync.failed_writes > 0 ? 'A lesson is not up to date in your Google Calendar' : 'Your calendar check is struggling'}</strong>
              <p>Open Calendar sync to see what is happening and what to do.</p>
            </div>
          </button>
        )}

        <div className="dash-grid-4" style={{ marginBottom: 20 }}>
          {stats.map(s => (
            <button key={s.label} type="button" className="stat-card" onClick={() => onSwitch(s.go)}>
              <div className="stat-icon" style={{ background: s.bg }}><Icon name={s.icon} /></div>
              <div className="stat-num">{s.num === undefined || s.num === null ? <Skeleton w={54} h={30} /> : s.num}</div>
              <div className="stat-label">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="calendar" /> Coming up</span>
                <button className="card-link" onClick={() => onSwitch('admin-bookings')}>All bookings →</button>
              </div>
              {!data ? <SkeletonRows rows={3} h={52} /> : data.upcoming.length === 0 ? (
                <EmptyState compact title="No lessons booked yet">New bookings from students appear here.</EmptyState>
              ) : data.upcoming.slice(0, 6).map(b => {
                const s = new Date(b.starts_at);
                return (
                  <div key={b.id} className="hw-item">
                    <div className="date-tile is-small" aria-hidden="true"><span>{s.toLocaleDateString(undefined, { timeZone: tz, month: 'short' })}</span><strong>{s.toLocaleDateString(undefined, { timeZone: tz, day: 'numeric' })}</strong></div>
                    <div className="hw-info">
                      <strong>{b.profiles?.full_name || 'Student'}</strong>
                      <span>{shortDateIn(tz, s)} · {timeIn(tz, s)} · {b.subject}</span>
                    </div>
                  </div>
                );
              })}
              <p className="fine-print">Times in {tz.replace(/_/g, ' ')}</p>
            </div>

            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="chart" /> Revenue, last 6 months</span>
                <button className="card-link" onClick={() => onSwitch('admin-billing')}>Invoices →</button>
              </div>
              {!data ? <Skeleton h={140} r={14} /> : (
                <div className="bars" role="img" aria-label={`Revenue by month: ${data.months.map(m => `${m.label} ${formatMoney(m.cents)}`).join(', ')}`}>
                  {data.months.map((m, i) => (
                    <div key={m.key} className="bar-col">
                      <span className="bar-val">{m.cents ? formatMoney(m.cents) : ''}</span>
                      <span className={`bar ${i === data.months.length - 1 ? 'is-now' : ''}`} style={{ height: `${Math.max(4, (m.cents / max) * 100)}%` }} />
                      <span className="bar-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card card-pad" style={{ alignSelf: 'start' }}>
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="sparkle" /> Quick actions</div>
            <div className="quick-actions">
              {actions.map(a => (
                <button key={a.label} type="button" className="qa-item" onClick={a.run || (() => onSwitch(a.go))}>
                  <span className="qa-icon"><Icon name={a.icon} /></span>
                  <span>{a.label}</span>
                  <Icon name="arrow" className="qa-arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
