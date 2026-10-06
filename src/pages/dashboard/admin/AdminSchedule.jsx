import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';

// Working days run Mon–Sun; hours 09:00 … 23:00 then 00:00 (after midnight).
const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
const hh = (h) => `${String(h).padStart(2, '0')}:00:00`;
const label = (h) => `${String(h).padStart(2, '0')}:00`;

export default function AdminSchedule() {
  const { showToast } = useApp();
  const [rules, setRules] = useState(null);      // Set of "weekday|HH:00:00"
  const [days, setDays] = useState([]);          // days off
  const [newDay, setNewDay] = useState('');
  const [tz, setTz] = useState('');

  const load = useCallback(async () => {
    const [r, e, s] = await Promise.all([
      supabase.from('availability_rules').select('weekday, start_time'),
      supabase.from('availability_exceptions').select('day, reason').order('day'),
      supabase.from('settings').select('value').eq('key', 'tutor_timezone').single(),
    ]);
    if (r.error) { showToast('Could not load your hours.', 'error'); setRules(new Set()); return; }
    setRules(new Set(r.data.map(x => `${x.weekday}|${x.start_time}`)));
    setDays(e.data || []);
    if (s.data) setTz(s.data.value);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (wd, h) => {
    const key = `${wd}|${hh(h)}`;
    const on = rules.has(key);
    setRules(prev => { const n = new Set(prev); on ? n.delete(key) : n.add(key); return n; });  // optimistic
    const { error } = on
      ? await supabase.from('availability_rules').delete().eq('weekday', wd).eq('start_time', hh(h))
      : await supabase.from('availability_rules').insert({ weekday: wd, start_time: hh(h) });
    if (error) { showToast(error.message, 'error'); load(); }
  };

  const addDayOff = async () => {
    if (!newDay) return;
    const { error } = await supabase.from('availability_exceptions').insert({ day: newDay });
    if (error) { showToast(error.code === '23505' ? 'That day is already off.' : error.message, 'error'); return; }
    setNewDay(''); load();
  };
  const removeDayOff = async (day) => {
    const { error } = await supabase.from('availability_exceptions').delete().eq('day', day);
    if (error) showToast(error.message, 'error'); else load();
  };

  return (
    <>
      <DashHeader title="Hours & days off" />
      <div className="dash-main">
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 4 }}>Weekly hours</div>
          <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
            Tap a box to open or close that lesson start time. Times are in <strong>{tz.replace(/_/g, ' ') || '…'}</strong>.
            The 00:00 row is just after midnight at the end of that working day. Students see these in their own time zone.
          </p>
          {rules === null ? <p>Loading…</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontSize: '.78rem' }}>
                <thead><tr><th />{DAYS.map(([, n]) => <th key={n} style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>{n}</th>)}</tr></thead>
                <tbody>
                  {HOURS.map(h => (
                    <tr key={h}>
                      <td style={{ color: 'var(--ink-muted)', paddingRight: 8 }}>{label(h)}</td>
                      {DAYS.map(([wd, n]) => {
                        const on = rules.has(`${wd}|${hh(h)}`);
                        return (
                          <td key={n}>
                            <button type="button" aria-pressed={on} aria-label={`${n} ${label(h)}`} onClick={() => toggle(wd, h)}
                              style={{ width: 38, height: 28, borderRadius: 6, border: '1.5px solid ' + (on ? 'var(--blue)' : 'var(--border)'), background: on ? 'var(--blue)' : 'white', cursor: 'pointer' }} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 4 }}>Days off</div>
          <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
            No new lessons can be booked on these days. Lessons already booked are not cancelled — do that in Bookings.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input type="date" value={newDay} onChange={e => setNewDay(e.target.value)} style={{ maxWidth: 200 }} />
            <button className="btn btn-primary btn-sm" disabled={!newDay} onClick={addDayOff}>Add day off</button>
          </div>
          {days.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No days off set.</p> : days.map(d => (
            <div key={d.day} className="hw-item">
              <div className="hw-info"><strong>{new Date(d.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
              <button className="btn btn-ghost btn-sm" onClick={() => removeDayOff(d.day)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
