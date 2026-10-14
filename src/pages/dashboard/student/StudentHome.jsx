import { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import DashHeader from '../../../components/dashboard/DashHeader';
import { getGreeting } from '../../../data/constants';
import { longDateIn, timeIn } from '../../../lib/time';
import Icon from '../../../components/ui/Icon';

const SKILLS = [
  ['grammar', 'Grammar', 'var(--blue)'],
  ['vocabulary', 'Vocabulary', '#E8829F'],
  ['speaking', 'Speaking', 'var(--purple)'],
  ['writing', 'Writing', 'var(--green)'],
];

export default function StudentHome({ onSwitch, onBuyCredits }) {
  const { currentUser } = useApp();
  const greeting = getGreeting();
  const name = currentUser?.name?.split(' ')[0] ?? 'there';
  const tz = currentUser?.timezone || 'UTC';
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [next, upcomingN, doneN, notes, resCount, resList] = await Promise.all([
        supabase.from('bookings').select('id, starts_at, subject, meet_url')
          .eq('status', 'confirmed').gt('ends_at', nowIso).order('starts_at').limit(1),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gt('ends_at', nowIso),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'completed']).lt('ends_at', nowIso),
        supabase.from('lesson_notes').select('level, scores, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('resources').select('id', { count: 'exact', head: true }),
        supabase.from('resources').select('id, title, category, uploader_id').order('created_at', { ascending: false }).limit(3),
      ]);
      const rows = notes.data || [];
      setD({
        next: next.data?.[0] ?? null,
        upcoming: upcomingN.count ?? 0,
        done: doneN.count ?? 0,
        level: currentUser?.englishLevel ?? null,
        scores: rows.find(r => r.scores && Object.keys(r.scores).length)?.scores ?? null,
        resourceCount: resCount.count ?? 0,
        resources: resList.data ?? [],
      });
    })();
  }, []);

  const stats = [
    { icon: 'lessons', bg: 'rgba(184,65,107,.1)', num: d?.done ?? '–', label: 'Lessons completed', go: 'lessons' },
    { icon: 'calendar', bg: 'var(--orange-bg)', num: d?.upcoming ?? '–', label: 'Upcoming lessons', go: 'lessons' },
    { icon: 'progress', bg: 'var(--green-bg)', num: d ? (d.level ?? '—') : '–', label: 'Current level', go: 'progress' },
    { icon: 'files', bg: 'var(--purple-bg)', num: d?.resourceCount ?? '–', label: 'Files', go: 'resources' },
  ];

  return (
    <>
      <DashHeader title={`${greeting}, ${name}`}>
        <button className="btn btn-primary btn-sm" onClick={onBuyCredits}><Icon name="credits" /> Buy Credits</button>
      </DashHeader>

      <div className="dash-main">
        <div className="dash-grid-4" style={{ marginBottom: 16 }}>
          {stats.map(s => (
            <button key={s.label} type="button" className="stat-card" onClick={() => onSwitch(s.go)}>
              <div className="stat-icon" style={{ background: s.bg }}><Icon name={s.icon} /></div>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="calendar" /> Upcoming Lesson</span>
                <button className="card-link" onClick={() => onSwitch('booking')}>Book more</button>
              </div>
              {d?.next ? (
                <>
                  <div style={{ background: 'linear-gradient(130deg,var(--navy),#6B2045)', borderRadius: 'var(--radius-sm)', padding: 16, color: 'white', marginBottom: 10 }}>
                    <div style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: .6, marginBottom: 4 }}>
                      Next · {longDateIn(tz, new Date(d.next.starts_at))} {timeIn(tz, new Date(d.next.starts_at))}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 10 }}>{d.next.subject}</div>
                    {d.next.meet_url
                      ? <a className="join-btn" href={d.next.meet_url} target="_blank" rel="noreferrer"><Icon name="video" weight="fill" /> Join Lesson</a>
                      : <button className="join-btn" onClick={() => onSwitch('lessons')}>View details</button>}
                  </div>
                  {currentUser?.nextLessonFocus && (
                    <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '.85rem', color: 'var(--ink-soft)', marginBottom: 8 }}>
                      <strong style={{ display: 'block', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-muted)', marginBottom: 4 }}>Neeliën's plan for your next lesson</strong>
                      {currentUser.nextLessonFocus}
                    </div>
                  )}
                  <div style={{ fontSize: '.78rem', color: 'var(--ink-muted)', padding: '8px 0' }}>
                    Move or cancel up to 2 hours before and your credit is kept or refunded.
                  </div>
                </>
              ) : (
                <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: 16, fontSize: '.85rem', color: 'var(--ink-soft)' }}>
                  {d ? (
                    <>
                      No lessons booked yet.{' '}
                      <button className="card-link" onClick={() => onSwitch('booking')}>Book your first lesson →</button>
                    </>
                  ) : 'Loading…'}
                </div>
              )}
            </div>

            <div className="card card-pad">
              <div className="card-header">
                <span className="card-title"><Icon name="files" /> Recent files</span>
                <button className="card-link" onClick={() => onSwitch('resources')}>View all</button>
              </div>
              {!d ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Loading…</p>
                : d.resources.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No files yet. Files you and Neeliën send each other appear here.</p>
                : d.resources.map(r => (
                  <div key={r.id} className="hw-item">
                    <div className="hw-info"><strong>{r.title}</strong><span>{r.uploader_id === currentUser.id ? 'Sent by you' : 'From Neeliën'}{r.category ? ` · ${r.category}` : ''}</span></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => onSwitch('resources')}>View</button>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 14 }}>My Progress</div>
              {d?.scores ? SKILLS.filter(([k]) => typeof d.scores[k] === 'number').map(([k, label, color]) => (
                <div key={k} className="prog-item">
                  <div className="prog-header"><strong>{label}</strong><span>{d.scores[k]}%</span></div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: `${d.scores[k]}%`, background: color }} /></div>
                </div>
              )) : (
                <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>
                  {d ? 'Your progress will appear here after your first lessons with Neeliën.' : 'Loading…'}
                </p>
              )}
            </div>

            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>
                {currentUser?.credits ?? 0}
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--ink-muted)', marginBottom: 12 }}>credits available</div>
              <button className="btn btn-primary btn-sm" onClick={onBuyCredits}><Icon name="credits" /> Buy More</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
