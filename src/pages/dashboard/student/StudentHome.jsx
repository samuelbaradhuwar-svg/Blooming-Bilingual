import { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import DashHeader from '../../../components/dashboard/DashHeader';
import Icon from '../../../components/ui/Icon';
import Hibiscus from '../../../components/ui/Hibiscus';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import { getGreeting } from '../../../data/constants';
import { longDateIn, timeIn } from '../../../lib/time';

export default function StudentHome({ onSwitch, onBuyCredits }) {
  const { currentUser } = useApp();
  const greeting = getGreeting();
  const name = currentUser?.name?.split(' ')[0] ?? 'there';
  const tz = currentUser?.timezone || 'UTC';
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [next, upcomingN, doneN, notes] = await Promise.all([
        supabase.from('bookings').select('id, starts_at, subject, meet_url')
          .eq('status', 'confirmed').gt('ends_at', nowIso).order('starts_at').limit(1),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gt('ends_at', nowIso),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'completed']).lt('ends_at', nowIso),
        supabase.from('lesson_notes').select('summary, homework, level, created_at, bookings(starts_at, subject)')
          .order('created_at', { ascending: false }).limit(3),
      ]);
      setD({
        next: next.data?.[0] ?? null,
        upcoming: upcomingN.count ?? 0,
        done: doneN.count ?? 0,
        feedback: (notes.data || []).find(n => n.summary || n.homework) ?? null,
      });
    })();
  }, []);

  const level = currentUser?.englishLevel ?? null;
  const stats = [
    { icon: 'calendar', bg: 'var(--soft-pink)', num: d?.upcoming, label: 'Upcoming lessons', go: 'lessons' },
    { icon: 'credits',  bg: '#F3E6EE',          num: currentUser?.credits ?? 0, label: 'Credit balance', go: 'credits' },
    { icon: 'progress', bg: 'var(--green-bg)',  num: d ? (level ?? '—') : undefined, label: 'Current level', go: 'progress' },
    { icon: 'lessons',  bg: '#F6EDF1',          num: d?.done, label: 'Lessons completed', go: 'lessons' },
  ];

  const actions = [
    { icon: 'calendar', label: 'Book a Lesson', run: () => onSwitch('booking') },
    { icon: 'credits',  label: 'Buy Credits',   run: onBuyCredits },
    { icon: 'chat',     label: 'Chat with Neeliën', run: () => onSwitch('chat') },
    { icon: 'files',    label: 'Send a File to Neeliën', run: () => onSwitch('resources') },
    { icon: 'progress', label: 'View My Progress', run: () => onSwitch('progress') },
  ];

  return (
    <>
      <DashHeader title="Dashboard">
        <button className="btn btn-primary btn-sm" onClick={onBuyCredits}><Icon name="credits" /> Buy Credits</button>
      </DashHeader>

      <div className="dash-main">
        <section className="welcome" aria-label="Welcome">
          <Hibiscus variant="silhouette" className="welcome-flower" />
          <h2 className="welcome-title">{greeting}, {name}</h2>
          <p>{d?.next ? 'Here is what is coming up in your learning.' : 'Ready for your next lesson? Pick a time that suits you.'}</p>
          {!currentUser?.avatar && <button type="button" className="btn btn-outline btn-sm welcome-buddy" onClick={() => onSwitch('profile')}><Icon name="sparkle" /> Pick your buddy</button>}
        </section>

        <div className="dash-grid-4" style={{ marginBottom: 20 }}>
          {stats.map(s => (
            <button key={s.label} type="button" className="stat-card" onClick={() => onSwitch(s.go)}>
              <div className="stat-icon" style={{ background: s.bg }}><Icon name={s.icon} /></div>
              <div className="stat-num">{s.num === undefined ? <Skeleton w={44} h={30} /> : s.num}</div>
              <div className="stat-label">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="calendar" /> Next lesson</span>
                <button className="card-link" onClick={() => onSwitch('booking')}>Book another</button>
              </div>
              {!d ? <Skeleton h={120} r={14} /> : d.next ? (
                <>
                  <div className="lesson-hero">
                    <div className="lesson-hero-when">{longDateIn(tz, new Date(d.next.starts_at))}</div>
                    <div className="lesson-hero-time">{timeIn(tz, new Date(d.next.starts_at))}</div>
                    <div className="lesson-hero-subject">{d.next.subject} · 45 min</div>
                    {d.next.meet_url
                      ? <a className="join-btn" href={d.next.meet_url} target="_blank" rel="noreferrer"><Icon name="video" weight="fill" /> Join Google Meet</a>
                      : <button className="join-btn" onClick={() => onSwitch('lessons')}>View details</button>}
                  </div>
                  {currentUser?.nextLessonFocus && (
                    <div className="note-box">
                      <strong>Neeliën’s plan for your next lesson</strong>
                      {currentUser.nextLessonFocus}
                    </div>
                  )}
                  <p className="fine-print">Move or cancel up to 2 hours before and your credit is kept or refunded.</p>
                </>
              ) : (
                <EmptyState compact title="No lessons booked yet" action={<button className="btn btn-primary btn-sm" onClick={() => onSwitch('booking')}>Book your first lesson</button>}>
                  Choose a date and time and your Google Meet link arrives straight away.
                </EmptyState>
              )}
            </div>

            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="notes" /> Latest feedback</span>
                <button className="card-link" onClick={() => onSwitch('progress')}>View all</button>
              </div>
              {!d ? <Skeleton h={80} r={14} /> : d.feedback ? (
                <div>
                  <div className="feedback-meta">{d.feedback.bookings?.subject}{d.feedback.bookings?.starts_at ? ` · ${longDateIn(tz, new Date(d.feedback.bookings.starts_at))}` : ''}</div>
                  {d.feedback.summary && <p className="feedback-text">{d.feedback.summary}</p>}
                  {d.feedback.homework && <div className="note-box"><strong>Homework</strong>{d.feedback.homework}</div>}
                </div>
              ) : (
                <EmptyState compact title="No feedback yet">After each lesson, Neeliën shares what you covered and your homework here.</EmptyState>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 12 }}><Icon name="sparkle" /> Quick actions</div>
              <div className="quick-actions">
                {actions.map(a => (
                  <button key={a.label} type="button" className="qa-item" onClick={a.run}>
                    <span className="qa-icon"><Icon name={a.icon} /></span>
                    <span>{a.label}</span>
                    <Icon name="arrow" className="qa-arrow" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
