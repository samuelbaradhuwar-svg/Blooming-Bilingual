import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { longDateIn } from '../../../lib/time';
import Icon from '../../../components/ui/Icon';
import Hibiscus from '../../../components/ui/Hibiscus';
import ProgressRing from '../../../components/ui/ProgressRing';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton, { SkeletonRows } from '../../../components/ui/Skeleton';

// Shared with the tutor's lesson-notes form.
export const SKILLS = [
  ['grammar', 'Grammar'],
  ['vocabulary', 'Vocabulary'],
  ['speaking', 'Speaking'],
  ['writing', 'Writing'],
];

const LEVEL_NAMES = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate', C1: 'Advanced', C2: 'Proficient' };
// A small bloom for each milestone reached: lessons taken.
const MILESTONES = [1, 5, 10, 20, 40];

export default function StudentProgress({ onSwitch }) {
  const { currentUser, showToast } = useApp();
  const tz = currentUser?.timezone || 'UTC';
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const [notes, done] = await Promise.all([
        supabase.from('lesson_notes')
          .select('id, summary, homework, scores, level, created_at, bookings(starts_at, subject)')
          .order('created_at', { ascending: false }).limit(50),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .in('status', ['confirmed', 'completed']).lt('ends_at', new Date().toISOString()),
      ]);
      if (notes.error) showToast('Could not load your progress.', 'error');
      setD({ notes: notes.data || [], lessons: done.count ?? 0 });
    })();
  }, []);

  const notes = d?.notes ?? [];
  const latestScores = notes.find(n => n.scores && Object.keys(n.scores).length)?.scores ?? null;
  const level = currentUser?.englishLevel || notes.find(n => n.level)?.level || null;
  const feedback = notes.filter(n => n.summary).slice(0, 3);
  const homework = notes.filter(n => n.homework).slice(0, 4);
  const lessons = d?.lessons ?? 0;
  const nextMilestone = MILESTONES.find(m => m > lessons);
  const dateOf = (n) => new Date(n.bookings?.starts_at || n.created_at);

  return (
    <>
      <DashHeader title="My Progress" />
      <div className="dash-main">
        <section className="journey" aria-label="Your level">
          <Hibiscus variant="silhouette" className="journey-flower" />
          <div className="journey-level">
            <div className="journey-label">Current level</div>
            <div className="journey-big">{d ? (level ?? '—') : <Skeleton w={70} h={46} />}</div>
            <div className="journey-name">{level ? LEVEL_NAMES[level] : d ? 'Not assessed yet' : ''}</div>
          </div>
          <div className="journey-side">
            <div className="journey-label">Lessons taken</div>
            <div className="journey-count">{d ? lessons : '–'}</div>
            <ul className="blooms" aria-label="Milestones">
              {MILESTONES.map(m => (
                <li key={m} className={lessons >= m ? 'on' : ''} title={`${m} lesson${m > 1 ? 's' : ''}`}>
                  <Hibiscus variant={lessons >= m ? 'full' : 'line'} size={34} />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
            {d && <p className="journey-next">{nextMilestone ? `${nextMilestone - lessons} more lesson${nextMilestone - lessons > 1 ? 's' : ''} to your next bloom.` : 'Every bloom reached. Beautiful work.'}</p>}
          </div>
        </section>

        <div className="dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 16 }}><Icon name="chart" /> Skill scores</div>
              {!d ? <Skeleton h={90} r={14} /> : latestScores ? (
                <div className="rings">
                  {SKILLS.filter(([k]) => typeof latestScores[k] === 'number').map(([k, label], i) => (
                    <div key={k} className="ring-card">
                      <ProgressRing value={latestScores[k]} label={label} color={['var(--plum)', 'var(--blush)', 'var(--sage)', '#B4417A'][i % 4]} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState compact title="Scores will appear here">Neeliën adds skill scores as she assesses your Grammar, Vocabulary, Speaking and Writing.</EmptyState>
              )}
            </div>

            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 6 }}><Icon name="notes" /> Recent tutor feedback</div>
              {!d ? <SkeletonRows rows={2} h={70} /> : feedback.length === 0 ? (
                <EmptyState compact title="No feedback yet" action={<button className="btn btn-primary btn-sm" onClick={() => onSwitch('booking')}>Book a lesson</button>}>
                  After each lesson, Neeliën shares what you covered here.
                </EmptyState>
              ) : feedback.map(n => (
                <article key={n.id} className="feedback-item">
                  <div className="feedback-meta">{longDateIn(tz, dateOf(n))} · {n.bookings?.subject}{n.level ? ` · Level ${n.level}` : ''}</div>
                  <p className="feedback-text">{n.summary}</p>
                </article>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {currentUser?.nextLessonFocus && (
              <div className="card card-pad">
                <div className="card-title" style={{ marginBottom: 8 }}><Icon name="target" /> Focus for your next lesson</div>
                <p className="feedback-text">{currentUser.nextLessonFocus}</p>
              </div>
            )}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 6 }}><Icon name="books" /> Homework</div>
              {!d ? <Skeleton h={70} r={14} /> : homework.length === 0 ? (
                <EmptyState compact title="No homework">Homework from your lessons will be listed here.</EmptyState>
              ) : homework.map(n => (
                <article key={n.id} className="feedback-item">
                  <div className="feedback-meta">Set {longDateIn(tz, dateOf(n))}</div>
                  <p className="feedback-text">{n.homework}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
