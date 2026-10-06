import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import DashHeader from '../../../components/dashboard/DashHeader';
import { MONTHS } from '../../../data/constants';

const SUBJECTS = ['Conversational English', 'IELTS Preparation', 'Business English', 'Grammar Focus'];

// Date key (YYYY-MM-DD) and clock time of an instant in the student's own time zone.
const dateKeyIn = (tz, d) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const timeIn = (tz, d) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
const pad = (n) => String(n).padStart(2, '0');

export default function BookingView({ onBuyCredits }) {
  const { currentUser, refreshCredits, showToast } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const credits = currentUser?.credits ?? 0;

  const [bookMonth, setBookMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [slots, setSlots] = useState([]);          // Date[] of open lesson starts
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);   // 'YYYY-MM-DD' in student tz
  const [selectedSlot, setSelectedSlot] = useState(null); // ISO string
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [busy, setBusy] = useState(false);

  const year = bookMonth.getFullYear();
  const month = bookMonth.getMonth();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const loadSlots = useCallback(async () => {
    setLoading(true);
    // pad a day each side so time-zone offsets can't hide edge-of-month slots
    const from = new Date(Date.UTC(year, month, 1) - 36e5 * 24);
    const to = new Date(Date.UTC(year, month + 1, 1) + 36e5 * 24);
    const { data, error } = await supabase.rpc('get_available_slots', { p_from: from.toISOString(), p_to: to.toISOString() });
    if (error) showToast('Could not load available times.', 'error');
    setSlots(error ? [] : data.map(r => new Date(r.starts_at)));
    setLoading(false);
  }, [year, month, showToast]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // Group open slots by the student's local date.
  const slotsByDay = useMemo(() => {
    const map = {};
    for (const d of slots) (map[dateKeyIn(tz, d)] ||= []).push(d);
    return map;
  }, [slots, tz]);

  const changeMonth = (dir) => {
    if (dir < 0 && isCurrentMonth) return;
    setBookMonth(m => new Date(m.getFullYear(), m.getMonth() + dir, 1));
    setSelectedDay(null); setSelectedSlot(null);
  };

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const keyFor = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

  const confirmBooking = async () => {
    if (!selectedSlot) { showToast('Please select a date and time first.', 'error'); return; }
    if (credits < 1) { showToast('You need at least 1 credit to book.', 'error'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('book_lesson', { p_starts_at: selectedSlot, p_subject: subject });
    setBusy(false);
    if (error) {
      showToast(error.message, 'error');
      loadSlots();             // the slot may have just been taken
      return;
    }
    const when = new Date(selectedSlot);
    showToast(`Booked! ${when.toLocaleDateString(undefined, { timeZone: tz, day: 'numeric', month: 'long' })} · ${timeIn(tz, when)}`, 'success');
    setSelectedSlot(null); setSelectedDay(null);
    refreshCredits(); loadSlots();
  };

  const daySlots = selectedDay ? (slotsByDay[selectedDay] || []) : [];
  const selectedLabel = selectedSlot
    ? `${new Date(selectedSlot).toLocaleDateString(undefined, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'long' })} · ${timeIn(tz, new Date(selectedSlot))}`
    : null;

  return (
    <>
      <DashHeader title="Book a Lesson" />
      <div className="dash-main">
        <div style={{ background: 'rgba(212,96,138,.06)', border: '1px solid rgba(212,96,138,.15)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.85rem', color: 'var(--navy)', fontWeight: 500 }}>🎟 You have <strong>{credits}</strong> credits</span>
          <span style={{ fontSize: '.78rem', color: 'var(--ink-muted)' }}>· 1 credit = 1 × 45-min lesson</span>
          <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={onBuyCredits}>Buy more</button>
        </div>

        <p style={{ fontSize: '.78rem', color: 'var(--ink-muted)', marginBottom: 12 }}>
          🌍 Times shown in <strong>{tz.replace(/_/g, ' ')}</strong> (your time zone)
        </p>

        <div className="booking-flow">
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <button className="btn btn-ghost btn-sm" disabled={isCurrentMonth} onClick={() => changeMonth(-1)}>← Prev</button>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: 'var(--navy)' }}>{MONTHS[month]} {year}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)}>Next →</button>
            </div>
            <div className="cal-grid">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="cal-day-name">{d}</div>)}
              {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const key = keyFor(d);
                const open = (slotsByDay[key] || []).length > 0;
                let cls = 'cal-day';
                if (!open) cls += " inactive";
                else { cls += ' has-slots'; if (key === selectedDay) cls += ' selected'; }
                return (
                  <button type="button" key={d} className={cls} disabled={!open} aria-pressed={key === selectedDay}
                    onClick={() => { setSelectedDay(key); setSelectedSlot(null); }}>
                    {d}
                  </button>
                );
              })}
            </div>
            {!loading && slots.length === 0 && (
              <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginTop: 12 }}>No open times this month.</p>
            )}
          </div>

          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 14 }}>
              {selectedDay ? `Available times — ${new Date(selectedDay + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}` : 'Pick a Time'}
            </div>
            {selectedDay ? (
              <div className="slots-grid" style={{ marginBottom: 20 }}>
                {daySlots.map(d => {
                  const iso = d.toISOString();
                  return (
                    <button key={iso} className={'time-slot' + (selectedSlot === iso ? ' selected' : '')} onClick={() => setSelectedSlot(iso)}>
                      {timeIn(tz, d)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>{loading ? 'Loading times…' : 'Select a date first.'}</p>
            )}

            <div className="form-group">
              <label>Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {selectedLabel && (
              <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16, fontSize: '.85rem', color: 'var(--ink-soft)' }}>
                <strong>📅 {selectedLabel}</strong><br />
                📘 {subject}<br />
                🎥 Google Meet link sent on confirmation
              </div>
            )}

            <button className="btn btn-primary btn-full" disabled={busy || !selectedSlot} onClick={confirmBooking}>
              {busy ? 'Booking…' : 'Confirm Booking — 1 Credit'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
