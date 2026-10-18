// Supabase Edge Function: calendar-sync
//
//   POST {action: 'sync' | 'full'}   Called every 2 minutes by the database (pg_cron) and by the "Check now" button.
//
// Reads the tutor's Google Calendar (incrementally, using Google's sync tokens) and passes the events to the database
// function calendar_apply_changes, which decides which times are busy. Nothing here decides availability.
//
// Secrets (Edge Functions -> Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (already set for google-meet).
// The shared password is read from the database table app_secrets (key 'google_meet_secret'), the same value google-meet uses.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
// Deploy with "Verify JWT" OFF: the database calls it directly and it checks its own password.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { runSync, type Deps } from './core.ts';

const env = (k: string) => Deno.env.get(k) ?? '';
const GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET');
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function accessToken(): Promise<string> {
  const { data } = await db.from('google_credentials').select('refresh_token').eq('id', 1).maybeSingle();
  if (!data) throw new Error('Google Calendar is not connected.');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token, grant_type: 'refresh_token',
    }),
  });
  const tok = await res.json();
  if (!res.ok) {
    console.error('Google token refresh failed:', tok.error);
    throw new Error('Google no longer accepts the saved connection. Reconnect Google in the tutor dashboard.');
  }
  return tok.access_token;
}

const deps: Deps = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  accessToken,
  fetch: (url, init) => fetch(url, init),
  async getState() {
    const { data, error } = await db.from('calendar_sync_state').select('sync_token, full_synced_at, consecutive_failures').eq('id', 1).single();
    if (error) throw new Error('The calendar sync tables are missing. Run the latest database update.');
    return data;
  },
  async saveState(patch) {
    const { error } = await db.from('calendar_sync_state').update(patch).eq('id', 1);
    if (error) throw new Error(error.message);
  },
  async apply(items, full, windowFrom, windowTo) {
    const { data, error } = await db.rpc('calendar_apply_changes', { p_items: items, p_full: full, p_window_from: windowFrom, p_window_to: windowTo });
    if (error) throw new Error(`Could not save the calendar: ${error.message}`);
    return data;
  },
  async log(kind, message, details) {
    await db.from('calendar_sync_log').insert({ kind, message, details: details ?? null });
  },
};

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

    const { data: row } = await db.from('app_secrets').select('value').eq('key', 'google_meet_secret').maybeSingle();
    const expected = (row?.value ?? '').trim();
    if (!expected || (req.headers.get('x-webhook-secret') ?? '').trim() !== expected) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const full = body?.action === 'full';

    // One sync at a time. If one is already running, ask it to do one more pass when it finishes.
    const { data: gotLock } = await db.rpc('calendar_try_lock', { p_seconds: 90 });
    if (!gotLock) return json({ ok: true, skipped: 'a sync is already running' });

    try {
      let startedAt = new Date().toISOString();
      let result = await runSync(deps, { full });
      for (let extra = 0; extra < 2 && result.ok; extra++) {
        const { data: st } = await db.from('calendar_sync_state').select('rerun_requested_at').eq('id', 1).single();
        if (!st?.rerun_requested_at || st.rerun_requested_at < startedAt) break;   // nobody asked for another pass while we were reading
        startedAt = new Date().toISOString();
        result = await runSync(deps, {});
      }
      return json(result, result.ok ? 200 : 502);
    } finally {
      await db.rpc('calendar_unlock');
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, 500);
  }
});
