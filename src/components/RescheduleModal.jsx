import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { dateKeyIn, timeIn, shortDateIn } from '../lib/time';

export default function RescheduleModal({ booking, onDone }) {
  const { currentUser, showToast, closeModal } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [slots, setSlots] = useState(null);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 45 * 864e5);
    supabase.rpc('get_available_slots', { p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data, error }) => {
        if (error) { showToast('Could not load available times.', 'error'); setSlots([]); return; }
        setSlots(data.map(r => new Date(r.starts_at)));
      });
  }, [showToast]);

  const byDay = useMemo(() => {
    const map = {};
    for (const d of slots || []) (map[dateKeyIn(tz, d)] ||= []).push(d);
    return map;
  }, [slots, tz]);
  const days = Object.keys(byDay);

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('reschedule_booking', { p_booking_id: booking.id, p_new_starts_at: slot });
    setBusy(false);
    if (error) { showToast(error.message, 'error'); return; }
    const when = new Date(slot);
    showToast(`Lesson moved to ${shortDateIn(tz, when)} · ${timeIn(tz, when)}`, 'success');
    closeModal();
    onDone();
  };

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
        Moving your lesson costs no credit. Times are in <strong>{tz.replace(/_/g, ' ')}</strong>.
      </p>
      {slots === null ? <p style={{ fontSize: '.85rem' }}>Loading times…</p> : days.length === 0 ? (
        <p style={{ fontSize: '.85rem' }}>No open times in the next 6 weeks.</p>
      ) : (
        <>
          <div className="form-group">
            <label>New date</label>
            <select value={day} onChange={e => { setDay(e.target.value); setSlot(null); }}>
              <option value="">Choose a date…</option>
              {days.map(k => <option key={k} value={k}>{shortDateIn(tz, byDay[k][0])}</option>)}
            </select>
          </div>
          {day && (
            <div className="slots-grid" style={{ marginBottom: 18 }}>
              {byDay[day].map(d => {
                const iso = d.toISOString();
                return <button key={iso} className={'time-slot' + (slot === iso ? ' selected' : '')} onClick={() => setSlot(iso)}>{timeIn(tz, d)}</button>;
              })}
            </div>
          )}
        </>
      )}
      <button className="btn btn-primary btn-full" disabled={!slot || busy} onClick={confirm}>
        {busy ? 'Moving…' : 'Confirm new time'}
      </button>
    </div>
  );
}
