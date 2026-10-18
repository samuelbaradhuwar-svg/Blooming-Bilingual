// Calendar sync core: reads the tutor's Google Calendar and hands what it finds to the database.
// Free of Deno-specific code so it can be tested anywhere; index.ts wires it to Supabase and Google.
//
// Every decision about what blocks a time slot lives in the database (calendar_apply_changes).
// This file only: fetches from Google (with retries), keeps the incremental-sync bookmark, and records success/failure.

export const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
export const WINDOW_PAST_DAYS = 2;
export const WINDOW_FUTURE_DAYS = 180;
export const FULL_RESYNC_EVERY_MS = 24 * 60 * 60 * 1000;   // re-read everything daily: rolls the window forward and heals any drift
export const MAX_ATTEMPTS = 5;                              // per Google request, for temporary failures
const MAX_PAGES = 40;

const FIELDS = 'nextPageToken,nextSyncToken,items(id,status,summary,description,transparency,eventType,start,end,creator(email),organizer(email),attendees(self,responseStatus),extendedProperties/private,source,updated)';

export interface SyncState {
  sync_token: string | null;
  full_synced_at: string | null;
  consecutive_failures: number;
}

export interface Deps {
  now(): number;
  sleep(ms: number): Promise<void>;
  accessToken(): Promise<string>;
  fetch(url: string, init?: { headers?: Record<string, string> }): Promise<Response>;
  getState(): Promise<SyncState>;
  saveState(patch: Record<string, unknown>): Promise<void>;
  apply(items: unknown[], full: boolean, windowFrom: string | null, windowTo: string | null): Promise<unknown>;
  log(kind: string, message: string, details?: unknown): Promise<void>;
}

export interface SyncResult {
  ok: boolean;
  mode?: 'full' | 'incremental';
  items?: number;
  applied?: unknown;
  error?: string;
}

export class GoneError extends Error {}
export class GoogleError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const iso = (ms: number) => new Date(ms).toISOString();

/** One Google request, retried with exponential backoff on temporary problems (rate limits, 5xx, network). */
export async function fetchPage(deps: Deps, token: string, url: string): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const last = attempt >= MAX_ATTEMPTS - 1;
    let res: Response;
    try {
      res = await deps.fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      if (last) throw new Error('Google Calendar could not be reached.');
      await deps.sleep(backoff(attempt));
      continue;
    }
    if (res.ok) return await res.json();
    if (res.status === 410) throw new GoneError('sync token expired');
    const body = (await res.text().catch(() => '')).slice(0, 300);
    const rateLimited = res.status === 429 || (res.status === 403 && /rateLimit|quotaExceeded|userRateLimit/i.test(body));
    if ((rateLimited || res.status >= 500) && !last) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await deps.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 20000) : backoff(attempt));
      continue;
    }
    if (res.status === 401) throw new GoogleError(401, 'Google no longer accepts the saved connection. Reconnect Google in the tutor dashboard.');
    if (res.status === 403) throw new GoogleError(403, 'Google refused access to the calendar. Reconnect Google and tick the calendar permission.');
    throw new GoogleError(res.status, `Google Calendar answered with an error (${res.status}).`);
  }
}

function backoff(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 15000) + Math.floor(Math.random() * 250);
}

/** Keep only what the database needs (and nothing private beyond it). */
export function pick(ev: any) {
  return {
    id: ev.id, status: ev.status, summary: ev.summary, description: ev.description, transparency: ev.transparency,
    eventType: ev.eventType, start: ev.start, end: ev.end, creator: ev.creator, organizer: ev.organizer,
    attendees: Array.isArray(ev.attendees) ? ev.attendees.filter((a: any) => a?.self).map((a: any) => ({ self: true, responseStatus: a.responseStatus })) : undefined,
    extendedProperties: ev.extendedProperties?.private ? { private: { bb_booking_id: ev.extendedProperties.private.bb_booking_id } } : undefined,
    source: ev.source,
  };
}

async function collect(deps: Deps, token: string, syncToken: string | null, startedMs: number) {
  const windowFrom = iso(startedMs - WINDOW_PAST_DAYS * 864e5);
  const windowTo = iso(startedMs + WINDOW_FUTURE_DAYS * 864e5);
  const items: unknown[] = [];
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const u = new URL(EVENTS_URL);
    u.searchParams.set('singleEvents', 'true');   // recurring events arrive as individual occurrences
    u.searchParams.set('showDeleted', 'true');    // cancellations must reach us so their times are released
    u.searchParams.set('maxResults', '250');
    u.searchParams.set('fields', FIELDS);
    if (syncToken) u.searchParams.set('syncToken', syncToken);
    else { u.searchParams.set('timeMin', windowFrom); u.searchParams.set('timeMax', windowTo); }
    if (pageToken) u.searchParams.set('pageToken', pageToken);
    const data = await fetchPage(deps, token, u.toString());
    for (const ev of data.items ?? []) items.push(pick(ev));
    if (data.nextPageToken) { pageToken = data.nextPageToken; continue; }
    nextSyncToken = data.nextSyncToken ?? null;
    break;
  }
  if (!nextSyncToken) throw new Error('Google did not finish sending the calendar. It will be retried.');
  return { items, nextSyncToken, windowFrom: syncToken ? null : windowFrom, windowTo: syncToken ? null : windowTo };
}

/**
 * One synchronisation pass. Never throws: failures are recorded (so the tutor can see them and booking pauses if they last)
 * and the previous bookmark is kept, so nothing is skipped.
 */
export async function runSync(deps: Deps, opts: { full?: boolean } = {}): Promise<SyncResult> {
  const started = deps.now();
  let failures = 0;
  try {
    await deps.saveState({ last_attempt_at: iso(started) });
    const state = await deps.getState();
    failures = state.consecutive_failures ?? 0;
    const token = await deps.accessToken();

    let full = !!opts.full || !state.sync_token || !state.full_synced_at
      || started - Date.parse(state.full_synced_at) > FULL_RESYNC_EVERY_MS;
    let got;
    try {
      got = await collect(deps, token, full ? null : state.sync_token, started);
    } catch (e) {
      if (e instanceof GoneError && !full) { full = true; got = await collect(deps, token, null, started); }   // Google forgot our bookmark: start over
      else throw e;
    }

    // Only after Google has sent everything do we change anything, so a half-finished read can never release a busy time.
    const applied = await deps.apply(got.items, full, got.windowFrom, got.windowTo);

    const patch: Record<string, unknown> = {
      sync_token: got.nextSyncToken, last_success_at: iso(deps.now()), last_error: null, last_error_at: null, consecutive_failures: 0,
    };
    if (full) Object.assign(patch, { full_synced_at: iso(started), window_from: got.windowFrom, window_to: got.windowTo, enforced: true });
    await deps.saveState(patch);
    if (full) await deps.log('sync_ok', `Your whole calendar was checked: ${got.items.length} event(s) in the next ${WINDOW_FUTURE_DAYS} days.`);
    return { ok: true, mode: full ? 'full' : 'incremental', items: got.items.length, applied };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    failures += 1;
    try {
      await deps.saveState({ last_error: message.slice(0, 300), last_error_at: iso(deps.now()), consecutive_failures: failures });
      if (failures === 1 || failures % 10 === 0) await deps.log('sync_failed', `Could not check your Google Calendar: ${message}`);
    } catch { /* nothing more we can do; the stale timestamp itself will pause booking */ }
    return { ok: false, error: message };
  }
}
