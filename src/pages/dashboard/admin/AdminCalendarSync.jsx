import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { shortDateIn, timeIn, timeAgo } from '../../../lib/time';
import Icon from '../../../components/ui/Icon';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonRows } from '../../../components/ui/Skeleton';

const KIND_ICON = {
  busy_added: 'calendar', busy_released: 'check', sync_ok: 'check', calendar_write: 'check', conflict_cleared: 'check', conflict_resolved: 'check',
  conflict: 'warning', sync_failed: 'warning', calendar_write_failed: 'warning', info: 'info',
};
const BAD_KINDS = new Set(['conflict', 'sync_failed', 'calendar_write_failed']);

const CONFLICT_COPY = {
  overlap: { title: (n) => `${n}'s website lesson clashes with something in your calendar`, fix: null },
  moved_in_calendar: { title: (n) => `${n}'s lesson was moved in Google Calendar`, fix: 'Put the calendar back' },
  removed_in_calendar: { title: (n) => `${n}'s lesson was deleted from Google Calendar`, fix: 'Add it back to the calendar' },
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** The tutor's view of how Preply, Google Calendar and the website are working together. Plain language, no jargon. */
export default function AdminCalendarSync({ onSwitch }) {
  const { currentUser, showToast } = useApp();
  const navigate = useNavigate();
  const tz = currentUser?.timezone || 'UTC';
  const [d, setD] = useState(null);
  const [missing, setMissing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [, tick] = useState(0);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const [ov, cf, fw, ext, lg, bk] = await Promise.all([
      supabase.rpc('admin_calendar_overview'),
      supabase.rpc('admin_calendar_conflicts'),
      supabase.rpc('admin_calendar_failed_writes'),
      supabase.rpc('admin_external_busy', { p_days: 14 }),
      supabase.rpc('admin_calendar_log', { p_limit: 25 }),
      supabase.from('bookings')
        .select('id, starts_at, ends_at, subject, google_event_id, profiles!bookings_student_id_fkey(full_name)')
        .eq('status', 'confirmed').gt('ends_at', new Date().toISOString()).order('starts_at').limit(15),
    ]);
    if (!alive.current) return null;
    if (ov.error) { setMissing(true); return null; }
    setMissing(false);
    const next = { overview: ov.data, conflicts: cf.data || [], failed: fw.data || [], external: ext.data || [], log: lg.data || [], bookings: bk.data || [] };
    setD(next);
    return next;
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const refresh = setInterval(() => { load(); tick(n => n + 1); }, 30000);   // keeps "checked 2 minutes ago" honest
    window.addEventListener('focus', load);
    return () => { alive.current = false; clearInterval(refresh); window.removeEventListener('focus', load); };
  }, [load]);

  const checkNow = async () => {
    setChecking(true);
    const before = d?.overview?.last_success_at ?? null;
    const { error } = await supabase.rpc('admin_request_calendar_sync', { p_full: false });
    if (error) { showToast(error.message, 'error'); setChecking(false); return; }
    let changed = false;
    for (let i = 0; i < 9 && !changed; i++) {   // the check runs in the background: wait up to ~27 seconds for its result
      await sleep(3000);
      const { data } = await supabase.rpc('admin_calendar_overview');
      changed = !!data && data.last_success_at !== before;
    }
    await load();
    setChecking(false);
    if (changed) showToast('Your calendar was just checked.', 'success');
    else showToast('No answer yet. It keeps trying every 2 minutes on its own.', 'error');
  };

  const resolve = async (c) => {
    setBusyId(c.id);
    const { error } = await supabase.rpc('admin_resolve_conflict', { p_id: c.id });
    setBusyId(null);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Marked as sorted.', 'success');
    load();
  };

  const resync = async (bookingId, key) => {
    setBusyId(key);
    const { error } = await supabase.rpc('admin_resync_booking', { p_booking_id: bookingId });
    if (error) { setBusyId(null); showToast(error.message, 'error'); return; }
    showToast('Updating your Google Calendar…', 'success');
    await sleep(6000);
    await load();
    setBusyId(null);
  };

  if (missing) {
    return (
      <>
        <DashHeader title="Calendar sync" />
        <div className="dash-main">
          <div className="card card-pad">
            <EmptyState title="One more setup step is needed">
              The calendar-sync database update has not been run yet. Once it has, this page shows how your calendar, Preply and the website are working together.
            </EmptyState>
          </div>
        </div>
      </>
    );
  }

  const o = d?.overview;
  const attention = d ? d.conflicts.length + d.failed.length : 0;

  const banner = (() => {
    if (!o) return null;
    const ago = o.last_success_at ? timeAgo(o.last_success_at) : null;
    switch (o.health) {
      case 'ok':
        if (attention > 0) return { tone: 'warn', icon: 'warning', title: `Your calendar is being read normally, but ${attention === 1 ? '1 lesson needs' : `${attention} things need`} your attention`, text: 'Nothing is paused and no lesson was changed for you. The details and what to do are listed below.' };
        return { tone: 'ok', icon: 'success', title: 'Everything is working', text: `Your Google Calendar was checked ${ago}. Preply lessons and your own events block those times on the website, and website lessons go into your calendar.` };
      case 'starting': return { tone: 'warn', icon: 'clock', title: 'Waiting for the first check', text: 'Your calendar has not been read yet. This usually takes a couple of minutes. Until it has been, bookings work as they always did.' };
      case 'warning': return { tone: 'warn', icon: 'warning', title: 'The last check did not go through', text: `${o.last_error || 'Google did not answer.'} It tries again every 2 minutes. Your last good check was ${ago}.` };
      case 'down': return { tone: 'bad', icon: 'warning', title: 'Booking is paused to protect you from double bookings', text: `Your calendar could not be checked for over 15 minutes${o.last_success_at ? ` (last good check ${ago})` : ''}, so students cannot book until it works again. ${o.last_error || ''}` };
      case 'not_connected': return { tone: 'warn', icon: 'link', title: 'Google Calendar is not connected', text: 'Connect your Google account so lessons from the website, Preply and your own events share one calendar.' };
      default: return null;
    }
  })();
  const needsReconnect = o && (/reconnect/i.test(o.last_error || '') || o.health === 'not_connected');

  return (
    <>
      <DashHeader title="Calendar sync">
        <button className="btn btn-primary btn-sm" onClick={checkNow} disabled={checking || !o?.connected}>
          <Icon name="sync" /> {checking ? 'Checking…' : 'Check now'}
        </button>
      </DashHeader>
      <div className="dash-main">
        {!d ? <SkeletonRows rows={3} h={72} /> : (
          <>
            {banner && (
              <section className={`sync-banner is-${banner.tone}`} role={banner.tone === 'bad' ? 'alert' : 'status'} aria-label="Calendar status">
                <Icon name={banner.icon} weight="fill" className="sync-banner-icon" />
                <div>
                  <strong>{banner.title}</strong>
                  <p>{banner.text}</p>
                  {needsReconnect && <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => onSwitch('admin-settings')}>Go to Hours & leave to connect Google</button>}
                </div>
              </section>
            )}

            <div className="dash-grid-4" style={{ marginBottom: 16 }}>
              <div className="stat-card"><div className="stat-icon" style={{ background: attention ? 'var(--red-bg)' : 'var(--green-bg)' }}><Icon name={attention ? 'warning' : 'check'} /></div><div className="stat-num" style={{ color: attention ? 'var(--red)' : undefined }}>{attention}</div><div className="stat-label">Need your attention</div></div>
              <div className="stat-card"><div className="stat-icon" style={{ background: '#F3E6EE' }}><Icon name="calendar" /></div><div className="stat-num">{o.external_upcoming}</div><div className="stat-label">Preply & other events blocking time</div></div>
              <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--soft-pink)' }}><Icon name="lessons" /></div><div className="stat-num">{o.website_upcoming}</div><div className="stat-label">Website lessons coming up</div></div>
              <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--orange-bg)' }}><Icon name="clock" /></div><div className="stat-num" style={{ fontSize: '1.1rem', lineHeight: 1.5 }}>{o.last_success_at ? timeAgo(o.last_success_at) : 'Not yet'}</div><div className="stat-label">Calendar last checked</div></div>
            </div>

            {attention > 0 && (
              <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'rgba(185,28,28,.35)' }}>
                <div className="card-title" style={{ marginBottom: 6 }}><Icon name="warning" /> Needs your attention ({attention})</div>
                <p className="fine-print" style={{ margin: '0 0 8px' }}>Nothing here was changed behind your back. You decide what happens to each lesson.</p>
                {d.conflicts.map(c => {
                  const copy = CONFLICT_COPY[c.kind] || CONFLICT_COPY.overlap;
                  const name = c.student_name || 'A student';
                  return (
                    <div key={c.id} className="hw-item attention-item">
                      <div className="hw-info" style={{ flex: 1, minWidth: 220 }}>
                        <strong>{copy.title(name)}</strong>
                        <span>{c.detail}</span>
                        <span>Lesson: {shortDateIn(tz, new Date(c.booking_starts_at))} · {timeIn(tz, new Date(c.booking_starts_at))}</span>
                      </div>
                      <div className="attention-actions">
                        {copy.fix && <button className="btn btn-outline btn-sm" disabled={busyId === `c${c.id}`} onClick={() => resync(c.booking_id, `c${c.id}`)}>{busyId === `c${c.id}` ? 'Working…' : copy.fix}</button>}
                        {c.kind === 'overlap' && <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard/admin-bookings')}>Open bookings</button>}
                        <button className="btn btn-ghost btn-sm" disabled={busyId === c.id} onClick={() => resolve(c)}>I have sorted this</button>
                      </div>
                    </div>
                  );
                })}
                {d.failed.map(f => (
                  <div key={f.booking_id} className="hw-item attention-item">
                    <div className="hw-info" style={{ flex: 1, minWidth: 220 }}>
                      <strong>{f.student_name} · {shortDateIn(tz, new Date(f.starts_at))} {timeIn(tz, new Date(f.starts_at))}</strong>
                      <span>{f.problem} It is retried automatically every 5 minutes.</span>
                    </div>
                    <div className="attention-actions">
                      <button className="btn btn-outline btn-sm" disabled={busyId === `f${f.booking_id}`} onClick={() => resync(f.booking_id, `f${f.booking_id}`)}>{busyId === `f${f.booking_id}` ? 'Working…' : 'Try again now'}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="dash-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card card-pad">
                  <div className="card-title" style={{ marginBottom: 4 }}><Icon name="calendar" /> Blocking time from your calendar (next 14 days)</div>
                  <p className="fine-print" style={{ margin: '0 0 8px' }}>Events in your Google Calendar that did not come from this website, such as Preply lessons. Students cannot book these times.</p>
                  {d.external.length === 0 ? <p className="fine-print" style={{ margin: 0 }}>Nothing from other sources in the next 14 days.</p> : d.external.map(x => (
                    <div key={x.google_event_id} className="hw-item">
                      <div className="date-tile is-small" aria-hidden="true"><span>{new Date(x.starts_at).toLocaleDateString(undefined, { timeZone: tz, month: 'short' })}</span><strong>{new Date(x.starts_at).toLocaleDateString(undefined, { timeZone: tz, day: 'numeric' })}</strong></div>
                      <div className="hw-info">
                        <strong>{x.summary || 'Busy'}</strong>
                        <span>{x.is_all_day ? 'All day' : `${timeIn(tz, new Date(x.starts_at))}–${timeIn(tz, new Date(x.ends_at))}`}</span>
                      </div>
                      {x.clashes && <span className="chip chip-red">Clashes with a lesson</span>}
                      <span className={`chip ${x.source === 'preply' ? 'chip-purple' : 'chip-blue'}`}>{x.source === 'preply' ? 'Preply' : 'Your calendar'}</span>
                    </div>
                  ))}
                  <p className="fine-print">Times in {tz.replace(/_/g, ' ')}</p>
                </div>

                <div className="card card-pad">
                  <div className="card-title" style={{ marginBottom: 4 }}><Icon name="lessons" /> Website lessons and your calendar</div>
                  <p className="fine-print" style={{ margin: '0 0 8px' }}>Each lesson booked here is added to your Google Calendar as busy time, which is what lets Preply avoid it.</p>
                  {d.bookings.length === 0 ? <p className="fine-print" style={{ margin: 0 }}>No upcoming website lessons.</p> : d.bookings.map(b => (
                    <div key={b.id} className="hw-item">
                      <div className="date-tile is-small" aria-hidden="true"><span>{new Date(b.starts_at).toLocaleDateString(undefined, { timeZone: tz, month: 'short' })}</span><strong>{new Date(b.starts_at).toLocaleDateString(undefined, { timeZone: tz, day: 'numeric' })}</strong></div>
                      <div className="hw-info">
                        <strong>{b.profiles?.full_name || 'Student'}</strong>
                        <span>{timeIn(tz, new Date(b.starts_at))}–{timeIn(tz, new Date(b.ends_at))} · {b.subject}</span>
                      </div>
                      {b.google_event_id && b.google_event_id !== 'pending'
                        ? <span className="chip chip-green">In your calendar</span>
                        : <span className="chip chip-orange">Not in calendar yet</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card card-pad">
                  <div className="card-title" style={{ marginBottom: 6 }}><Icon name="clock" /> What has been happening</div>
                  {d.log.length === 0 ? <p className="fine-print" style={{ margin: 0 }}>Nothing yet. Changes in your calendar and website lessons will be listed here.</p> : d.log.map((l, i) => (
                    <div key={i} className={`log-item ${BAD_KINDS.has(l.kind) ? 'is-bad' : ''}`}>
                      <Icon name={KIND_ICON[l.kind] || 'info'} />
                      <div><span>{l.message}</span><small>{timeAgo(l.at)}</small></div>
                    </div>
                  ))}
                </div>

                <details className="card card-pad setup-card">
                  <summary><Icon name="info" /> How Preply fits in (one-time setup)</summary>
                  <ol>
                    <li>In <strong>Preply</strong>, go to Settings, then Calendar, and connect the <strong>same Google account</strong> that is connected here.</li>
                    <li>In Preply's calendar settings, turn on the option that lets Google Calendar events <strong>block your availability</strong>.</li>
                    <li>Keep using one Google Calendar for everything. Events marked <em>Free</em> (not Busy) never block a time.</li>
                    <li>To test: add a 50-minute event to your Google Calendar for a time the website offers. Within about two minutes it disappears from the booking page.</li>
                  </ol>
                  <p className="fine-print" style={{ margin: 0 }}>Preply has no public connection for other systems, so Google Calendar is the meeting point: Preply writes its lessons there, this website reads them.</p>
                </details>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
