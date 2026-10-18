import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import DashHeader from '../../../components/dashboard/DashHeader';
import { MONTHS, SUBJECTS } from '../../../data/constants';
import { pad, dateKeyIn, timeIn } from '../../../lib/time';
import Icon from '../../../components/ui/Icon';
import Field from '../../../components/ui/Field';


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
  const [paused, setPaused] = useState(false);     // true while the tutor's calendar can't be verified: nothing is offered rather than guessed

  const year = bookMonth.getFullYear();
  const month = bookMonth.getMonth();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const loadSlots = useCallback(async () => {
    setLoading(true);
    // pad a day each side so time-zone offsets can't hide edge-of-month slots
    const from = new Date(Date.UTC(year, month, 1) - 36e5 * 24);
    const to = new Date(Date.UTC(year, month + 1, 1) + 36e5 * 24);
    const [{ data, error }, status] = await Promise.all([
      supabase.rpc('get_available_slots', { p_from: from.toISOString(), p_to: to.toISOString() }),
      supabase.rpc('calendar_availability_status'),
    ]);
    setPaused(!status.error && status.data?.ok === false);
    if (error) showToast('Could not load available times.', 'error');
    setSlots(error ? [] : data.map(r => new Date(r.starts_at)));
    setLoading(false);
  }, [year, month, showToast]);

  useEffect(() => { loadSlots(); }, [loadSlots]);
  // While paused, look again every minute so the page recovers on its own.
  useEffect(() => {
    if (!paused) return undefined;
    const t = setInterval(loadSlots, 60000);
    return () => clearInterval(t);
  }, [paused, loadSlots]);

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
        <div className="info-strip">
          <span className="info-strip-main"><Icon name="credits" /> You have <strong>{credits}</strong> {credits === 1 ? 'credit' : 'credits'}</span>
          <span className="info-strip-sub">1 credit = one 45-minute lesson</span>
          <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={onBuyCredits}>Buy more</button>
        </div>

        <p className="fine-print" style={{ margin: '0 0 14px' }}>
          <Icon name="globe" /> Times are shown in <strong>{tz.replace(/_/g, ' ')}</strong> (your time zone)
        </p>

        {paused && (
          <p className="form-warn" role="alert">
            <Icon name="warning" weight="fill" /> Booking is paused for a few minutes while we double-check Neeliën’s calendar. This protects you from double bookings. This page checks again by itself, or try again shortly.
          </p>
        )}

        <div className="booking-flow">
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <button className="btn btn-ghost btn-sm" disabled={isCurrentMonth} onClick={() => changeMonth(-1)} aria-label="Previous month"><Icon name="back" /> Prev</button>
              <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--navy)' }} aria-live="polite">{MONTHS[month]} {year}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} aria-label="Next month">Next <Icon name="arrow" /></button>
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
            {!loading && slots.length === 0 && !paused && (
              <p className="fine-print">No open times this month. Try the next month.</p>
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

            <Field label="Subject">
              {id => (
                <select id={id} value={subject} onChange={e => setSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              )}
            </Field>

            {selectedLabel && (
              <div className="booking-summary" aria-live="polite">
                <strong>Your booking</strong>
                <div><Icon name="calendar" /> {selectedLabel}</div>
                <div><Icon name="books" /> {subject} · 45 minutes</div>
                <div><Icon name="video" /> Google Meet link sent on confirmation</div>
                <div><Icon name="credits" /> Uses 1 credit</div>
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
