import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { SUBJECTS } from '../data/constants';
import { dateKeyIn, longDateIn, timeIn, zonedToUtc } from '../lib/time';
import Field from './ui/Field';
import Icon from './ui/Icon';

const LESSON_MIN = 45;

/**
 * The tutor books a lesson for a student, with the student's agreement.
 * Pass `student` ({ id, full_name, timezone, credits }) to book for someone specific, or leave it out to choose one.
 * Times are entered in the tutor's own time zone, and shown in the student's too. Overlapping another lesson is refused
 * here and, as the real guarantee, by the database.
 */
export default function BookForStudent({ student: fixed, onDone }) {
  const { currentUser, closeModal, showToast, refreshChatUnread } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [students, setStudents] = useState(fixed ? [fixed] : null);
  const [studentId, setStudentId] = useState(fixed?.id || '');
  const [date, setDate] = useState(() => dateKeyIn(tz, new Date(Date.now() + 864e5)));
  const [time, setTime] = useState('');
  const [openTimes, setOpenTimes] = useState([]);   // 'HH:mm' of her open slots that day
  const [busyList, setBusyList] = useState([]);     // lessons already booked around that day
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [useCredit, setUseCredit] = useState(true);
  const [notify, setNotify] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fixed) return;
    supabase.rpc('admin_student_overview').then(({ data }) => setStudents(data || []));
  }, [fixed]);

  const student = (students || []).find(s => s.id === studentId) || null;
  // Spend a credit by default only when the student has one.
  useEffect(() => { if (student) setUseCredit((student.credits ?? 0) >= 1); }, [student?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Her open slots and the lessons already booked, for the chosen day.
  const loadDay = useCallback(async () => {
    if (!date) return;
    const from = zonedToUtc(tz, date, '00:00');
    const to = new Date(from.getTime() + 24 * 36e5);
    const [slots, booked] = await Promise.all([
      supabase.rpc('get_available_slots', { p_from: from.toISOString(), p_to: to.toISOString() }),
      supabase.from('bookings').select('id, starts_at, ends_at, profiles(full_name)')
        .in('status', ['confirmed', 'completed']).gt('ends_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at'),
    ]);
    setOpenTimes(slots.error ? [] : slots.data.map(r => timeIn(tz, new Date(r.starts_at))));
    setBusyList(booked.error ? [] : booked.data);
  }, [date, tz]);
  useEffect(() => { loadDay(); }, [loadDay]);

  const startsAt = date && /^\d{2}:\d{2}$/.test(time) ? zonedToUtc(tz, date, time) : null;
  const endsAt = startsAt ? new Date(startsAt.getTime() + LESSON_MIN * 60000) : null;
  const clash = startsAt && busyList.find(b => startsAt < new Date(b.ends_at) && endsAt > new Date(b.starts_at));
  const inPast = startsAt && startsAt <= new Date();
  const offHours = startsAt && time && !openTimes.includes(time);
  const stTz = student?.timezone || 'UTC';
  const ready = student && startsAt && !clash && !inPast && consent && !busy;

  const submit = async () => {
    setError(''); setBusy(true);
    const { error: err } = await supabase.rpc('admin_book_lesson', {
      p_student: studentId, p_starts_at: startsAt.toISOString(), p_subject: subject,
      p_use_credit: useCredit, p_consent: consent, p_notify: notify,
    });
    setBusy(false);
    if (err) { setError(err.message); loadDay(); return; }
    showToast(`Lesson booked for ${student.full_name || 'the student'}.`, 'success');
    refreshChatUnread?.();
    closeModal(); onDone?.();
  };

  return (
    <div>
      <p style={{ fontSize: '.88rem', color: 'var(--ink-soft)', marginBottom: 14 }}>
        Book a lesson for a student who has agreed to the time. It uses the same rules as a student booking: no two lessons can overlap, and once booked the time disappears for everyone else.
      </p>

      {fixed ? (
        <div className="info-strip" style={{ marginBottom: 14 }}><span className="info-strip-main"><Icon name="student" /> {fixed.full_name || 'Student'}</span><span className="info-strip-sub">{fixed.credits ?? 0} credit{fixed.credits === 1 ? '' : 's'}</span></div>
      ) : (
        <Field label="Student">
          {id => (
            <select id={id} value={studentId} onChange={e => setStudentId(e.target.value)}>
              <option value="">{students ? 'Choose a student…' : 'Loading…'}</option>
              {(students || []).map(s => <option key={s.id} value={s.id}>{s.full_name || s.email} ({s.credits} credit{s.credits === 1 ? '' : 's'})</option>)}
            </select>
          )}
        </Field>
      )}

      <Field label={`Date (${tz.replace(/_/g, ' ')})`}>
        {id => <input id={id} type="date" value={date} min={dateKeyIn(tz, new Date())} onChange={e => { setDate(e.target.value); setTime(''); }} />}
      </Field>

      <div className="form-group">
        <span className="form-label-like">Time</span>
        {openTimes.length > 0 ? (
          <div className="slots-grid" role="group" aria-label="Your open times that day" style={{ marginBottom: 10 }}>
            {openTimes.map(t => <button key={t} type="button" className={`time-slot${time === t ? ' selected' : ''}`} aria-pressed={time === t} onClick={() => setTime(t)}>{t}</button>)}
          </div>
        ) : <p className="fine-print" style={{ margin: '0 0 8px' }}>No open slots that day. You can still choose a time below.</p>}
        <Field label="Or choose any other time" style={{ marginBottom: 0 }}>
          {id => <input id={id} type="time" step="300" value={time} onChange={e => setTime(e.target.value)} />}
        </Field>
      </div>

      {busyList.length > 0 && (
        <div className="note-box" style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Already booked around that day</strong>
          {busyList.map(b => <div key={b.id}>{timeIn(tz, new Date(b.starts_at))}–{timeIn(tz, new Date(b.ends_at))} · {b.profiles?.full_name || 'Student'}</div>)}
        </div>
      )}

      {clash && <p className="form-warn" role="alert"><Icon name="warning" weight="fill" /> This overlaps {clash.profiles?.full_name || 'another'}'s lesson ({timeIn(tz, new Date(clash.starts_at))}–{timeIn(tz, new Date(clash.ends_at))}). Please choose another time.</p>}
      {inPast && <p className="form-warn" role="alert"><Icon name="warning" weight="fill" /> That time has already passed.</p>}
      {offHours && !clash && !inPast && <p className="form-hint"><Icon name="info" /> This isn't one of your usual open slots. You can still book it.</p>}

      <Field label="Subject">
        {id => <select id={id} value={subject} onChange={e => setSubject(e.target.value)}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>}
      </Field>

      <label className="check"><input type="checkbox" checked={useCredit} onChange={e => setUseCredit(e.target.checked)} />
        <span><strong>Use one of the student's credits</strong><small>{student ? `${student.full_name?.split(' ')[0] || 'They'} has ${student.credits ?? 0}. Untick if this lesson was arranged or paid outside the site.` : 'Untick if this lesson was arranged or paid outside the site.'}</small></span>
      </label>
      <label className="check"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
        <span><strong>Message the student the details</strong><small>Adds a chat message in their time zone. The Google Meet invite is emailed as usual.</small></span>
      </label>
      <label className="check is-required"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span><strong>The student has agreed to this lesson time</strong><small>Required. Only book for students who have said yes.</small></span>
      </label>

      {startsAt && student && !inPast && (
        <div className="booking-summary" aria-live="polite">
          <strong>Booking summary</strong>
          <div><Icon name="student" /> {student.full_name || 'Student'}</div>
          <div><Icon name="calendar" /> You: {longDateIn(tz, startsAt)} · {timeIn(tz, startsAt)}–{timeIn(tz, endsAt)} ({tz.replace(/_/g, ' ')})</div>
          <div><Icon name="globe" /> Student: {longDateIn(stTz, startsAt)} · {timeIn(stTz, startsAt)} ({stTz.replace(/_/g, ' ')})</div>
          <div><Icon name="credits" /> {useCredit ? 'Uses 1 credit' : 'No credit used'}</div>
        </div>
      )}

      {error && <p className="form-warn" role="alert"><Icon name="warning" weight="fill" /> {error}</p>}
      <button type="button" className="btn btn-primary btn-full" disabled={!ready} onClick={submit}>{busy ? 'Booking…' : 'Book lesson'}</button>
    </div>
  );
}
