// Supabase Edge Function: google-meet
//
//   GET  ?code=…&state=…   Google redirects the tutor here after she allows access (one time).
//   POST {booking_id}      Called by the database when a booking is created, moved or cancelled.
//
// Secrets (Edge Functions → Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, WEBHOOK_SECRET, SITE_URL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
// Deploy with "Verify JWT" OFF: Google and the database call it directly, and it checks its own secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const env = (k: string) => Deno.env.get(k) ?? '';
const SUPABASE_URL = env('SUPABASE_URL');
const GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET');
const WEBHOOK_SECRET = env('WEBHOOK_SECRET');
const SITE_URL = env('SITE_URL').replace(/\/$/, '');
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/google-meet`;
const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const db = createClient(SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const redirect = (path: string) => new Response(null, { status: 302, headers: { Location: `${SITE_URL}${path}` } });

// ───────── one-time connection ─────────
async function oauthCallback(url: URL) {
  const back = (r: string) => redirect(`/dashboard/admin-settings?google=${r}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code || !state) return back('denied');

  // The state must be a fresh one-time code issued to a signed-in tutor.
  const { data: nonce } = await db.from('google_connect_nonces').select('nonce')
    .eq('nonce', state).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!nonce) return back('expired');
  await db.from('google_connect_nonces').delete().eq('nonce', state);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: FUNCTION_URL, grant_type: 'authorization_code',
    }),
  });
  const tok = await res.json();
  if (!res.ok || !tok.refresh_token) { console.error('token exchange failed', tok.error); return back('failed'); }

  let email: string | null = null;
  try {
    const payload = JSON.parse(atob(tok.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    email = payload.email ?? null;
  } catch { /* email is only for display */ }

  const { error } = await db.from('google_credentials').upsert({
    id: 1, refresh_token: tok.refresh_token, account_email: email, connected_at: new Date().toISOString(),
  });
  if (error) { console.error(error.message); return back('failed'); }
  return back('connected');
}

// ───────── Google Calendar helpers ─────────
async function accessToken(): Promise<string> {
  const { data } = await db.from('google_credentials').select('refresh_token').eq('id', 1).maybeSingle();
  if (!data) throw new Error('Google is not connected');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token, grant_type: 'refresh_token',
    }),
  });
  const tok = await res.json();
  if (!res.ok) throw new Error(`Google refused the saved connection (${tok.error}). Reconnect Google in the tutor dashboard.`);
  return tok.access_token;
}

const meetLinkOf = (ev: any): string | null =>
  ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ?? null;

async function gcal(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${CAL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'DELETE' && (res.status === 404 || res.status === 410)) return null;
  if (!res.ok) throw new Error(`Google Calendar ${method} failed (${res.status}): ${await res.text()}`);
  return res.status === 204 ? null : await res.json();
}

// ───────── booking events ─────────
async function bookingEvent(req: Request) {
  if (!WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) return json({ error: 'forbidden' }, 403);
  const { booking_id } = await req.json();
  if (!booking_id) return json({ error: 'booking_id required' }, 400);

  const { data: b } = await db.from('bookings')
    .select('id, student_id, starts_at, ends_at, subject, status, meet_url, google_event_id, google_sync_at')
    .eq('id', booking_id).maybeSingle();
  if (!b) return json({ skipped: 'booking not found' });

  const token = await accessToken();
  const hasEvent = b.google_event_id && b.google_event_id !== 'pending';

  // Cancelled → remove the event (Google also tells the student).
  if (b.status === 'cancelled') {
    if (hasEvent) await gcal(token, 'DELETE', `/${b.google_event_id}?sendUpdates=all`);
    return json({ ok: true, action: 'deleted' });
  }
  if (b.status !== 'confirmed') return json({ skipped: b.status });

  // Moved → update the event.
  if (hasEvent) {
    await gcal(token, 'PATCH', `/${b.google_event_id}?sendUpdates=all`, {
      start: { dateTime: new Date(b.starts_at).toISOString(), timeZone: 'UTC' },
      end: { dateTime: new Date(b.ends_at).toISOString(), timeZone: 'UTC' },
    });
    return json({ ok: true, action: 'updated' });
  }

  // New → claim the booking so two overlapping calls can't create two events.
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: claimed } = await db.from('bookings')
    .update({ google_event_id: 'pending', google_sync_at: new Date().toISOString() })
    .eq('id', b.id)
    .or(`google_event_id.is.null,and(google_event_id.eq.pending,google_sync_at.lt.${staleBefore})`)
    .select('id');
  if (!claimed?.length) return json({ skipped: 'already being created' });

  try {
    const { data: student } = await db.from('profiles').select('full_name, email').eq('id', b.student_id).maybeSingle();
    const first = (student?.full_name || 'Student').split(' ')[0];
    let ev = await gcal(token, 'POST', '?conferenceDataVersion=1&sendUpdates=all', {
      summary: `English lesson — ${first}`,
      description: `${b.subject}\n\nManage your lessons: ${SITE_URL}/dashboard/lessons`,
      start: { dateTime: new Date(b.starts_at).toISOString(), timeZone: 'UTC' },
      end: { dateTime: new Date(b.ends_at).toISOString(), timeZone: 'UTC' },
      attendees: student?.email ? [{ email: student.email, displayName: student.full_name || undefined }] : [],
      conferenceData: { createRequest: { requestId: b.id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      reminders: { useDefault: true },
    });
    // Meet link creation is occasionally a moment behind; check again briefly.
    for (let i = 0; i < 3 && !meetLinkOf(ev); i++) {
      await new Promise((r) => setTimeout(r, 1000));
      ev = await gcal(token, 'GET', `/${ev.id}?conferenceDataVersion=1`);
    }
    await db.from('bookings').update({ google_event_id: ev.id, meet_url: b.meet_url ?? meetLinkOf(ev) }).eq('id', b.id);
    return json({ ok: true, action: 'created', meet: !!meetLinkOf(ev) });
  } catch (e) {
    await db.from('bookings').update({ google_event_id: null }).eq('id', b.id).eq('google_event_id', 'pending');
    throw e;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'GET') return await oauthCallback(new URL(req.url));
    if (req.method === 'POST') return await bookingEvent(req);
    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : 'failed' }, 500);
  }
});
