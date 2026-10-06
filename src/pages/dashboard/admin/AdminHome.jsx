import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { getGreeting, formatMoney } from '../../../data/constants';
import { dateKeyIn, timeIn, shortDateIn } from '../../../lib/time';


export default function AdminHome({ onSwitch }) {
  const { currentUser, showToast } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [students, upcoming, needsNotes, orders] = await Promise.all([
        supabase.rpc('admin_student_overview'),
        supabase.from('bookings').select('id, starts_at, subject, profiles(full_name)')
          .eq('status', 'confirmed').gt('ends_at', new Date().toISOString()).order('starts_at').limit(50),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('status', 'confirmed').lt('ends_at', new Date().toISOString()),
        supabase.from('orders').select('amount_cents').eq('status', 'paid').gte('paid_at', monthStart.toISOString()),
      ]);
      if (students.error || upcoming.error) { showToast('Could not load the dashboard.', 'error'); return; }
      setData({
        students: students.data,
        upcoming: upcoming.data,
        toReview: needsNotes.count ?? 0,
        revenue: (orders.data || []).reduce((s, o) => s + o.amount_cents, 0),
      });
    })();
  }, [showToast]);

  const today = dateKeyIn(tz, new Date());
  const todays = (data?.upcoming || []).filter(b => dateKeyIn(tz, new Date(b.starts_at)) === today);
  const first = currentUser?.name?.split(' ')[0] ?? '';
  const month = new Date().toLocaleDateString(undefined, { month: 'long' });

  const stats = data && [
    { icon: '👥', bg: 'rgba(212,96,138,.08)', num: data.students.length, label: 'Students', go: 'admin-students' },
    { icon: '💰', bg: 'var(--green-bg)', num: formatMoney(data.revenue), label: `Revenue · ${month}`, go: 'admin-billing' },
    { icon: '📅', bg: 'var(--orange-bg)', num: todays.length, label: 'Lessons today', go: 'admin-bookings' },
    { icon: '📝', bg: 'var(--red-bg)', num: data.toReview, label: 'Lessons to wrap up', go: 'admin-lessons' },
  ];

  return (
    <>
      <DashHeader title={`${getGreeting()}, ${first} 🌸`} />
      <div className="dash-main">
        {!data ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Loading…</p> : (
          <>
            <div className="dash-grid-4" style={{ marginBottom: 16 }}>
              {stats.map(s => (
                <div key={s.label} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onSwitch(s.go)}>
                  <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                  <div className="stat-num">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title">📅 Coming up</span>
                <button className="card-link" onClick={() => onSwitch('admin-bookings')}>All bookings →</button>
              </div>
              {data.upcoming.length === 0 ? (
                <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No lessons booked yet.</p>
              ) : data.upcoming.slice(0, 8).map(b => (
                <div key={b.id} className="hw-item">
                  <div className="hw-info">
                    <strong>{b.profiles?.full_name || 'Student'}</strong>
                    <span>{shortDateIn(tz, new Date(b.starts_at))} · {timeIn(tz, new Date(b.starts_at))} · {b.subject}</span>
                  </div>
                </div>
              ))}
              <p style={{ fontSize: '.74rem', color: 'var(--ink-muted)', marginTop: 10 }}>Times in {tz.replace(/_/g, ' ')}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
