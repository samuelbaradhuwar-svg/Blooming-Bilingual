import { useState, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import DashHeader from '../../../components/dashboard/DashHeader';
import { MONTHS, ALL_SLOTS, BOOKED_SLOTS } from '../../../data/constants';

function getKey(year, month, day) { return `${year}-${month + 1}-${day}`; }

export default function BookingView({ onBuyCredits }) {
  const { currentUser, addCredits, showToast } = useApp();

  const [bookMonth, setBookMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [subject, setSubject] = useState('Conversational English');
  const [bookedSlots, setBookedSlots] = useState(BOOKED_SLOTS);

  const credits = currentUser?.credits ?? 0;
  const year = bookMonth.getFullYear();
  const month = bookMonth.getMonth();

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const changeMonth = (dir) => {
    if (dir < 0 && isCurrentMonth) return;
    setBookMonth(m => new Date(m.getFullYear(), m.getMonth() + dir, 1));
    setSelectedDay(null); setSelectedTime(null);
  };

  const slotsForDay = useCallback((d) => {
    const booked = bookedSlots[getKey(year, month, d)] || [];
    const n = new Date();
    const isToday = year === n.getFullYear() && month === n.getMonth() && d === n.getDate();
    // slots after midnight (00:00) belong to the evening session, so only trim same-day past hours
    return ALL_SLOTS.filter(s => !booked.includes(s) && !(isToday && s !== '00:00' && Number(s.slice(0, 2)) <= n.getHours()));
  }, [bookedSlots, year, month]);

  const buildCalendar = () => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const cells = [];

    for (let i = 0; i < firstDow; i++) cells.push({ key: `empty-${i}`, empty: true });

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      const past = new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const available = slotsForDay(d);
      cells.push({ d, inactive: past || dow === 0, booked: !past && dow !== 0 && available.length === 0, hasSlots: available.length > 0 });
    }
    return cells;
  };

  const confirmBooking = () => {
    if (!selectedDay || !selectedTime) { showToast('Please select a date and time first.', 'error'); return; }
    if (credits < 1) { showToast('You need at least 1 credit to book.', 'error'); return; }

    const key = getKey(year, month, selectedDay);
    setBookedSlots(prev => ({ ...prev, [key]: [...(prev[key] || []), selectedTime] }));
    addCredits(-1);
    showToast(`Booked! ${selectedDay} ${MONTHS[month]} · ${selectedTime} — Confirmation email sent!`, 'success');
    setSelectedDay(null); setSelectedTime(null);
  };

  const cells = buildCalendar();
  const availableForSelected = selectedDay ? slotsForDay(selectedDay) : [];

  return (
    <>
      <DashHeader title="Book a Lesson" />
      <div className="dash-main">
        {/* Credit banner */}
        <div style={{ background: 'rgba(212,96,138,.06)', border: '1px solid rgba(212,96,138,.15)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.85rem', color: 'var(--navy)', fontWeight: 500 }}>🎟 You have <strong>{credits}</strong> credits</span>
          <span style={{ fontSize: '.78rem', color: 'var(--ink-muted)' }}>· 1 credit = 1 × 45-min lesson</span>
          <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={onBuyCredits}>Buy more</button>
        </div>

        <div className="booking-flow">
          {/* Calendar */}
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <button className="btn btn-ghost btn-sm" disabled={isCurrentMonth} onClick={() => changeMonth(-1)}>← Prev</button>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: 'var(--navy)' }}>
                {MONTHS[month]} {year}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)}>Next →</button>
            </div>
            <div className="cal-grid">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="cal-day-name">{d}</div>
              ))}
              {cells.map((cell) => {
                if (cell.empty) return <div key={cell.key} />;
                let cls = 'cal-day';
                if (cell.inactive) cls += ' inactive';
                else if (cell.booked) cls += ' booked';
                else {
                  cls += ' has-slots';
                  if (cell.d === selectedDay) cls += ' selected';
                }
                return (
                  <button
                    type="button"
                    key={cell.d}
                    className={cls}
                    disabled={cell.inactive || cell.booked}
                    aria-pressed={cell.d === selectedDay}
                    onClick={() => { setSelectedDay(cell.d); setSelectedTime(null); }}
                  >
                    {cell.d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time + form */}
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 14 }}>
              {selectedDay ? `Available times — ${selectedDay} ${MONTHS[month]}` : 'Pick a Time'}
            </div>
            {selectedDay ? (
              <div className="slots-grid" style={{ marginBottom: 20 }}>
                {ALL_SLOTS.map(t => {
                  const isBooked = !availableForSelected.includes(t);
                  let cls = 'time-slot' + (isBooked ? ' booked' : '') + (selectedTime === t ? ' selected' : '');
                  return (
                    <button key={t} className={cls} disabled={isBooked} onClick={() => setSelectedTime(t)}>{t}</button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>Select a date first.</p>
            )}

            <div className="form-group">
              <label>Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}>
                <option>Conversational English</option>
                <option>IELTS Preparation</option>
                <option>Business English</option>
                <option>Grammar Focus</option>
              </select>
            </div>

            {selectedDay && selectedTime && (
              <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16, fontSize: '.85rem', color: 'var(--ink-soft)' }}>
                <strong>📅 {selectedDay} {MONTHS[month]} · {selectedTime}</strong><br />
                📘 {subject}<br />
                🎥 Google Meet link sent on confirmation
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={confirmBooking}>
              Confirm Booking — 1 Credit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
