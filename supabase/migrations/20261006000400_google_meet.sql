-- Automatic Google Meet links: a Google Calendar event (with Meet) is created for every booking,
-- moved when the lesson moves and deleted when it is cancelled. The work happens in the
-- `google-meet` Edge Function; this script holds the data and the triggers that call it.
-- Run AFTER 20261006000300_private_files.sql.

-- Needed to call the Edge Function from the database, and to retry on a schedule.
create extension if not exists pg_net;
create extension if not exists pg_cron;

begin;

-- ───────── Server-only storage (no client can read or write these) ─────────
create table if not exists public.app_secrets (key text primary key, value text not null);
create table if not exists public.google_credentials (
  id             integer primary key default 1 check (id = 1),     -- one tutor, one connection
  refresh_token  text not null,
  account_email  text,
  connected_at   timestamptz not null default now()
);
create table if not exists public.google_connect_nonces (
  nonce       text primary key,
  expires_at  timestamptz not null
);
alter table public.app_secrets          enable row level security;
alter table public.google_credentials   enable row level security;
alter table public.google_connect_nonces enable row level security;
revoke all on public.app_secrets, public.google_credentials, public.google_connect_nonces from anon, authenticated;
-- (no policies on purpose: only the service role and SECURITY DEFINER functions can touch them)

alter table public.bookings
  add column if not exists google_event_id text,
  add column if not exists google_sync_at timestamptz;

-- ───────── Tutor-only helpers used by the dashboard ─────────
-- Start "Connect Google": returns a one-time code that the callback checks, so only a
-- signed-in tutor can attach a Google account.
create or replace function public.admin_start_google_connect()
returns text language plpgsql security definer set search_path = public as $$
declare v_nonce text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  delete from public.google_connect_nonces where expires_at < now();
  insert into public.google_connect_nonces (nonce, expires_at) values (v_nonce, now() + interval '10 minutes');
  return v_nonce;
end $$;

create or replace function public.admin_google_status()
returns table (connected boolean, account_email text, connected_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select true, g.account_email, g.connected_at from public.google_credentials g
    union all
    select false, null::text, null::timestamptz where not exists (select 1 from public.google_credentials)
    limit 1;
end $$;

create or replace function public.admin_disconnect_google()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  delete from public.google_credentials;
end $$;

-- ───────── Tell the Edge Function about a booking ─────────
create or replace function public.call_google_meet(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_secret text;
begin
  if not exists (select 1 from public.google_credentials) then return; end if;   -- not connected yet
  select value into v_url    from public.app_secrets where key = 'google_meet_url';
  select value into v_secret from public.app_secrets where key = 'google_meet_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body    := jsonb_build_object('booking_id', p_booking_id)
  );
end $$;

create or replace function public.bookings_google_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.call_google_meet(new.id);
  return new;
end $$;

drop trigger if exists bookings_google_after_insert on public.bookings;
create trigger bookings_google_after_insert after insert on public.bookings
  for each row when (new.status = 'confirmed') execute function public.bookings_google_trigger();

drop trigger if exists bookings_google_after_update on public.bookings;
create trigger bookings_google_after_update after update of starts_at, status on public.bookings
  for each row when (
    (old.starts_at is distinct from new.starts_at or old.status is distinct from new.status)
    and new.status in ('confirmed', 'cancelled')
  ) execute function public.bookings_google_trigger();

-- Safety net: every 5 minutes, retry upcoming lessons that still have no Meet link.
create or replace function public.google_meet_backfill()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select id from public.bookings
     where status = 'confirmed' and starts_at > now() and meet_url is null
       and created_at < now() - interval '2 minutes'
       and (google_event_id is null or (google_event_id = 'pending' and google_sync_at < now() - interval '10 minutes'))
     limit 20
  loop
    perform public.call_google_meet(r.id);
  end loop;
end $$;

select cron.unschedule('google-meet-backfill') where exists (select 1 from cron.job where jobname = 'google-meet-backfill');
select cron.schedule('google-meet-backfill', '*/5 * * * *', 'select public.google_meet_backfill()');

-- ───────── Permissions ─────────
revoke execute on function public.admin_start_google_connect(), public.admin_google_status(), public.admin_disconnect_google(),
  public.call_google_meet(uuid), public.bookings_google_trigger(), public.google_meet_backfill() from public, anon, authenticated;
grant execute on function public.admin_start_google_connect(), public.admin_google_status(), public.admin_disconnect_google() to authenticated;

commit;
