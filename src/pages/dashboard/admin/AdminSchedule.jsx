import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { dateKeyIn } from '../../../lib/time';
import GoogleConnect from './GoogleConnect';
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
  const [newDayEnd, setNewDayEnd] = useState('');
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
    const end = newDayEnd || newDay;
    if (end < newDay) { showToast('The end date must be on or after the start date.', 'error'); return; }
    // every date from start to end (inclusive), as YYYY-MM-DD
    const dates = [];
    for (let d = new Date(newDay + 'T12:00:00Z'); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
      if (dates.length > 120) { showToast('Please add at most 120 days at a time.', 'error'); return; }
    }
    const { error } = await supabase.from('availability_exceptions').upsert(dates.map(day => ({ day })), { onConflict: 'day', ignoreDuplicates: true });
    if (error) { showToast(error.message, 'error'); return; }
    // Warn about lessons already booked in that period — those are NOT cancelled automatically.
    const lo = new Date(newDay + 'T00:00:00Z').getTime() - 864e5;
    const hi = new Date(end + 'T00:00:00Z').getTime() + 2 * 864e5;
    const { data: booked } = await supabase.from('bookings').select('starts_at').eq('status', 'confirmed')
      .gte('starts_at', new Date(lo).toISOString()).lte('starts_at', new Date(hi).toISOString());
    const clash = (booked || []).filter(b => { const k = dateKeyIn(tz || 'UTC', new Date(b.starts_at)); return k >= newDay && k <= end; }).length;
    showToast(clash ? `Leave added. ${clash} booked lesson${clash === 1 ? '' : 's'} fall in this period — cancel ${clash === 1 ? 'it' : 'them'} in Bookings.` : 'Leave added.', clash ? 'info' : 'success');
    setNewDay(''); setNewDayEnd(''); load();
  };
  // Collapse consecutive dates into ranges for display: [{from, to}]
  const ranges = [];
  for (const { day } of days) {
    const last = ranges[ranges.length - 1];
    const next = last && new Date(new Date(last.to + 'T12:00:00Z').getTime() + 864e5).toISOString().slice(0, 10);
    if (last && next === day) last.to = day; else ranges.push({ from: day, to: day });
  }
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const removeRange = async (r) => {
    const { error } = await supabase.from('availability_exceptions').delete().gte('day', r.from).lte('day', r.to);
    if (error) showToast(error.message, 'error'); else load();
  };

  return (
    <>
      <DashHeader title="Hours & leave" />
      <div className="dash-main">
        <GoogleConnect />
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
          <div className="card-title" style={{ marginBottom: 4 }}>Leave & days off</div>
          <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
            No new lessons can be booked on these days. Lessons already booked are not cancelled — do that in Bookings.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: '.75rem', color: 'var(--ink-muted)' }}>From<br /><input type="date" value={newDay} onChange={e => setNewDay(e.target.value)} style={{ maxWidth: 180 }} /></label>
            <label style={{ fontSize: '.75rem', color: 'var(--ink-muted)' }}>To (optional)<br /><input type="date" value={newDayEnd} min={newDay || undefined} onChange={e => setNewDayEnd(e.target.value)} style={{ maxWidth: 180 }} /></label>
            <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} disabled={!newDay} onClick={addDayOff}>Add leave</button>
          </div>
          {ranges.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No leave booked.</p> : ranges.map(r => (
            <div key={r.from} className="hw-item">
              <div className="hw-info"><strong>{r.from === r.to ? fmt(r.from) : `${fmt(r.from)} → ${fmt(r.to)}`}</strong></div>
              <button className="btn btn-ghost btn-sm" onClick={() => removeRange(r)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
