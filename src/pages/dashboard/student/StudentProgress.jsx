import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { longDateIn } from '../../../lib/time';
import Icon from '../../../components/ui/Icon';

export const SKILLS = [
  ['grammar', 'Grammar', 'var(--blue)'],
  ['vocabulary', 'Vocabulary', '#E8829F'],
  ['speaking', 'Speaking', 'var(--purple)'],
  ['writing', 'Writing', 'var(--green)'],
];

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
  const levelNotes = notes.filter(n => n.level);
  const level = currentUser?.englishLevel || levelNotes[0]?.level || null;
  const dateOf = (n) => new Date(n.bookings?.starts_at || n.created_at);

  return (
    <>
      <DashHeader title="My Progress" />
      <div className="dash-main">
        <div className="dash-grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-num">{d ? (level ?? '—') : '–'}</div><div className="stat-label">Current level</div></div>
          <div className="stat-card"><div className="stat-num">{d ? d.lessons : '–'}</div><div className="stat-label">Lessons taken</div></div>
          <div className="stat-card"><div className="stat-num">{d ? notes.length : '–'}</div><div className="stat-label">Lesson notes</div></div>
        </div>

        <div className="dash-grid">
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="notes" /> Lesson notes</div>
            {!d ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Loading…</p>
              : notes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 8, color: 'var(--blue)', display: 'flex', justifyContent: 'center' }}><Icon name="grow" /></div>
                  <p style={{ fontSize: '.9rem', color: 'var(--ink-soft)', marginBottom: 12 }}>
                    After each lesson, Neeliën adds notes here: what you covered and your homework.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => onSwitch('booking')}>Book a lesson</button>
                </div>
              ) : notes.map(n => (
                <div key={n.id} style={{ padding: '12px 0', borderTop: '1px solid var(--border, rgba(0,0,0,.07))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <strong style={{ fontSize: '.9rem' }}>{longDateIn(tz, dateOf(n))}</strong>
                    <span style={{ fontSize: '.78rem', color: 'var(--ink-muted)' }}>{n.bookings?.subject}{n.level ? ` · Level ${n.level}` : ''}</span>
                  </div>
                  {n.summary && <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)', margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{n.summary}</p>}
                  {n.homework && (
                    <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '.82rem', color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>
                      <strong style={{ display: 'block', fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-muted)', marginBottom: 2 }}>Homework</strong>
                      {n.homework}
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 14 }}>Skills</div>
              {latestScores ? SKILLS.filter(([k]) => typeof latestScores[k] === 'number').map(([k, label, color]) => (
                <div key={k} className="prog-item">
                  <div className="prog-header"><strong>{label}</strong><span>{latestScores[k]}%</span></div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: `${latestScores[k]}%`, background: color }} /></div>
                </div>
              )) : (
                <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>
                  {d ? 'Your skill scores will appear here once Neeliën has assessed them.' : 'Loading…'}
                </p>
              )}
            </div>

            {currentUser?.nextLessonFocus && (
              <div className="card card-pad">
                <div className="card-title" style={{ marginBottom: 8 }}><Icon name="target" /> Focus for your next lesson</div>
                <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)', margin: 0, whiteSpace: 'pre-wrap' }}>{currentUser.nextLessonFocus}</p>
              </div>
            )}

            {levelNotes.length > 1 && (
              <div className="card card-pad">
                <div className="card-title" style={{ marginBottom: 8 }}><Icon name="progress" /> Level history</div>
                {levelNotes.slice(0, 6).map(n => (
                  <div key={n.id} className="hw-item">
                    <div className="hw-info"><strong>{n.level}</strong><span>{longDateIn(tz, dateOf(n))}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
