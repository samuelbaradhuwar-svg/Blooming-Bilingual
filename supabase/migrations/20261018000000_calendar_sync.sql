-- Unified availability: Preply + website + Google Calendar.
-- Run AFTER 20261015000100_tutor_booking.sql.
--
-- How it fits together
--   Preply  --writes lessons-->  Google Calendar  --read every 2 min by the calendar-sync Edge Function-->  external_busy
--   Website bookings  --google-meet Edge Function-->  Google Calendar  --(Preply reads busy times)-->  Preply
--   get_available_slots() hides every time that overlaps a website booking OR an external_busy event.
--   If the calendar can't be verified for 15 minutes, booking pauses (it never guesses).
--
-- Nothing changes for students until the calendar-sync function has completed its first successful sync
-- (calendar_sync_state.enforced stays false until then), so this is safe to run before the function is deployed.

begin;

-- ───────── Tracking columns ─────────
-- The start time last pushed to Google, so a failed move/cancel can be noticed and retried.
alter table public.bookings add column if not exists google_synced_starts_at timestamptz;
update public.bookings set google_synced_starts_at = starts_at
 where google_synced_starts_at is null and google_event_id is not null and google_event_id <> 'pending' and status = 'confirmed';

-- ───────── Server-only tables (clients never touch these; the tutor reads them through the admin_* functions) ─────────
create table if not exists public.calendar_sync_state (
  id                   integer primary key default 1 check (id = 1),
  sync_token           text,                         -- Google's incremental-sync bookmark
  window_from          timestamptz,
  window_to            timestamptz,
  full_synced_at       timestamptz,
  last_attempt_at      timestamptz,
  last_success_at      timestamptz,
  last_error           text,
  last_error_at        timestamptz,
  consecutive_failures integer not null default 0,
  enforced             boolean not null default false,  -- turns true after the first successful sync; from then on a stale sync pauses booking
  lock_until           timestamptz,                    -- stops two syncs running at once
  rerun_requested_at   timestamptz
);
insert into public.calendar_sync_state (id) values (1) on conflict (id) do nothing;

-- Busy time found in the tutor's Google Calendar that is NOT one of the website's own lesson events
-- (Preply lessons, personal appointments, anything she adds by hand).
create table if not exists public.external_busy (
  google_event_id text primary key,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null check (ends_at > starts_at),
  summary         text,
  source          text not null default 'other' check (source in ('preply', 'other')),
  is_all_day      boolean not null default false,
  first_seen_at   timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists external_busy_range_idx on public.external_busy using gist (tstzrange(starts_at, ends_at));

-- A website lesson that clashes with an external event (or that was changed behind the website's back in Google Calendar).
-- Never resolved silently by overwriting either side: the tutor decides.
create table if not exists public.booking_conflicts (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  google_event_id text,
  kind            text not null check (kind in ('overlap', 'moved_in_calendar', 'removed_in_calendar')),
  detail          text,
  status          text not null default 'open' check (status in ('open', 'resolved')),
  detected_at     timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolution      text
);
create unique index if not exists booking_conflicts_open_uniq
  on public.booking_conflicts (booking_id, kind, (coalesce(google_event_id, ''))) where status = 'open';

-- Plain-language activity feed for the tutor (and an audit trail of synchronisation events).
create table if not exists public.calendar_sync_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  kind    text not null,
  message text not null,
  details jsonb
);
create index if not exists calendar_sync_log_at_idx on public.calendar_sync_log (at desc);

-- Audit trail of every booking change (who, when, what). Credits already have their own immutable ledger.
create table if not exists public.booking_audit (
  id              bigint generated always as identity primary key,
  at              timestamptz not null default now(),
  booking_id      uuid not null,
  student_id      uuid,
  action          text not null,           -- created | rescheduled | cancelled | status_changed
  old_starts_at   timestamptz,
  new_starts_at   timestamptz,
  old_status      text,
  new_status      text,
  credit_charged  boolean,
  actor           uuid                     -- null = the system (e.g. a scheduled job)
);
create index if not exists booking_audit_booking_idx on public.booking_audit (booking_id, at);

alter table public.calendar_sync_state enable row level security;
alter table public.external_busy       enable row level security;
alter table public.booking_conflicts   enable row level security;
alter table public.calendar_sync_log   enable row level security;
alter table public.booking_audit       enable row level security;
revoke all on public.calendar_sync_state, public.external_busy, public.booking_conflicts, public.calendar_sync_log, public.booking_audit from anon, authenticated;
grant all on public.calendar_sync_state, public.external_busy, public.booking_conflicts, public.calendar_sync_log, public.booking_audit to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Where the calendar-sync Edge Function lives (the shared password is the same one google-meet already uses).
insert into public.app_secrets (key, value) values ('calendar_sync_url', 'https://bgpeowkwvrpboqtgxkkt.supabase.co/functions/v1/calendar-sync')
on conflict (key) do update set value = excluded.value;

-- ───────── Booking audit trail ─────────
create or replace function public.bookings_audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_audit (booking_id, student_id, action, new_starts_at, new_status, credit_charged, actor)
    values (new.id, new.student_id, 'created', new.starts_at, new.status::text, new.credit_charged, auth.uid());
  elsif old.status is distinct from new.status or old.starts_at is distinct from new.starts_at then
    insert into public.booking_audit (booking_id, student_id, action, old_starts_at, new_starts_at, old_status, new_status, credit_charged, actor)
    values (new.id, new.student_id,
            case when new.status = 'cancelled' and old.status <> 'cancelled' then 'cancelled'
                 when old.starts_at is distinct from new.starts_at then 'rescheduled'
                 else 'status_changed' end,
            old.starts_at, new.starts_at, old.status::text, new.status::text, new.credit_charged, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists bookings_audit_after on public.bookings;
create trigger bookings_audit_after after insert or update of status, starts_at on public.bookings
  for each row execute function public.bookings_audit_trigger();

-- One starting row per existing booking, so the trail is complete from day one.
insert into public.booking_audit (at, booking_id, student_id, action, new_starts_at, new_status, credit_charged)
select b.created_at, b.id, b.student_id, 'created', b.starts_at, 'confirmed', b.credit_charged
  from public.bookings b
 where not exists (select 1 from public.booking_audit a where a.booking_id = b.id);
insert into public.booking_audit (at, booking_id, student_id, action, old_starts_at, new_starts_at, old_status, new_status, credit_charged)
select b.cancelled_at, b.id, b.student_id, 'cancelled', b.starts_at, b.starts_at, 'confirmed', 'cancelled', b.credit_charged
  from public.bookings b
 where b.status = 'cancelled' and b.cancelled_at is not null
   and not exists (select 1 from public.booking_audit a where a.booking_id = b.id and a.action = 'cancelled');

-- ───────── Is availability trustworthy right now? ─────────
-- ok = true when the calendar isn't in use yet, or the last successful sync is under 15 minutes old.
create or replace function public.calendar_availability_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.calendar_sync_state;
begin
  select * into s from public.calendar_sync_state where id = 1;
  if not found or not s.enforced or not exists (select 1 from public.google_credentials) then
    return jsonb_build_object('ok', true);
  end if;
  if s.last_success_at is null or s.last_success_at < now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'The calendar could not be checked recently.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ───────── Open times: website bookings AND external calendar events both block a slot ─────────
create or replace function public.get_available_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select public.setting_text('tutor_timezone')                  as tz,
           public.setting_text('lesson_minutes')::int             as mins,
           public.setting_text('cancel_window_hours')::int        as notice_h,
           coalesce((public.calendar_availability_status()->>'ok')::boolean, true) as sync_ok
  ),
  days as (
    select d::date as day
    from cfg,
         generate_series((p_from at time zone cfg.tz)::date - 1, (p_to at time zone cfg.tz)::date, interval '1 day') d  -- -1: after-midnight slots of the previous working day
  ),
  candidates as (
    select ((days.day + r.start_time + case when r.start_time < time '06:00' then interval '1 day' else interval '0' end) at time zone cfg.tz) as s
    from days
    cross join cfg
    join public.availability_rules r on r.weekday = extract(dow from days.day)::int
    where not exists (select 1 from public.availability_exceptions e where e.day = days.day)
  )
  select c.s
  from candidates c, cfg
  where cfg.sync_ok                                                   -- calendar not verifiable => offer nothing rather than guess
    and c.s >= p_from and c.s < p_to
    and c.s > now() + make_interval(hours => cfg.notice_h)            -- minimum notice
    and not exists (
      select 1 from public.bookings b
      where b.status in ('confirmed', 'completed')
        and tstzrange(b.starts_at, b.ends_at) && tstzrange(c.s, c.s + make_interval(mins => cfg.mins))
    )
    and not exists (
      select 1 from public.external_busy x
      where tstzrange(x.starts_at, x.ends_at) && tstzrange(c.s, c.s + make_interval(mins => cfg.mins))
    )
  order by c.s
$$;

-- ───────── Booking functions: same rules as before, plus a clear message while availability can't be verified ─────────
create or replace function public.book_lesson(p_starts_at timestamptz, p_subject text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_mins int := public.setting_text('lesson_minutes')::int;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  if coalesce(trim(p_subject), '') = '' then raise exception 'Subject is required'; end if;

  if not coalesce((public.calendar_availability_status()->>'ok')::boolean, true) then
    raise exception 'Booking is paused for a few minutes while we double-check Neeliën''s calendar. Please try again shortly.' using errcode = 'P0001';
  end if;

  -- Serialise this student's bookings so two parallel requests can't both spend the last credit.
  perform 1 from public.profiles where id = v_uid for update;

  if public.credit_balance(v_uid) < 1 then
    raise exception 'You need at least 1 credit to book.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.get_available_slots(p_starts_at, p_starts_at + interval '1 minute') s
    where s.starts_at = p_starts_at
  ) then
    raise exception 'That time is no longer available.' using errcode = 'P0001';
  end if;

  begin
    insert into public.bookings (student_id, starts_at, ends_at, subject)
    values (v_uid, p_starts_at, p_starts_at + make_interval(mins => v_mins), p_subject)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'That time is no longer available.' using errcode = 'P0001';
  end;

  insert into public.credit_ledger (student_id, delta, reason, booking_id, created_by)
  values (v_uid, -1, 'booking', v_id, v_uid);

  return v_id;
end $$;

create or replace function public.reschedule_booking(p_booking_id uuid, p_new_starts_at timestamptz)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_mins int := public.setting_text('lesson_minutes')::int;
  b public.bookings;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '28000'; end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (b.student_id <> v_uid and not v_admin) then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'confirmed' then raise exception 'Only confirmed bookings can be rescheduled.'; end if;
  if not v_admin and b.starts_at - now() <= make_interval(hours => public.setting_text('cancel_window_hours')::int) then
    raise exception 'Too late to reschedule — lessons can be moved up to % hours before.', public.setting_text('cancel_window_hours')
      using errcode = 'P0001';
  end if;

  if not coalesce((public.calendar_availability_status()->>'ok')::boolean, true) then
    raise exception 'Rescheduling is paused for a few minutes while we double-check Neeliën''s calendar. Please try again shortly.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.get_available_slots(p_new_starts_at, p_new_starts_at + interval '1 minute') s
    where s.starts_at = p_new_starts_at
  ) then
    raise exception 'That time is no longer available.' using errcode = 'P0001';
  end if;

  begin
    update public.bookings
       set starts_at = p_new_starts_at,
           ends_at   = p_new_starts_at + make_interval(mins => v_mins)
     where id = b.id;
  exception when exclusion_violation then
    raise exception 'That time is no longer available.' using errcode = 'P0001';
  end;
end $$;

-- The tutor's own booking for a student: any future time is allowed, but it can't overlap a lesson or a calendar event.
create or replace function public.admin_book_lesson(
  p_student uuid, p_starts_at timestamptz, p_subject text,
  p_use_credit boolean default true, p_consent boolean default false, p_notify boolean default true
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_mins int := public.setting_text('lesson_minutes')::int;
  v_stu public.profiles;
  v_id uuid;
  v_tz text;
  v_when text;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not coalesce(p_consent, false) then
    raise exception 'Please confirm that the student has agreed to this lesson time.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_subject), '') = '' then raise exception 'Subject is required' using errcode = 'P0001'; end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Please choose a time in the future.' using errcode = 'P0001';
  end if;

  select * into v_stu from public.profiles where id = p_student and role = 'student' for update;
  if not found then raise exception 'That student could not be found.' using errcode = 'P0001'; end if;

  if p_use_credit and public.credit_balance(p_student) < 1 then
    raise exception '% has no credits left. Add credits first, or book without using a credit.',
      coalesce(nullif(v_stu.full_name, ''), 'This student') using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.external_busy x
     where tstzrange(x.starts_at, x.ends_at) && tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_mins))
  ) then
    raise exception 'That time is already busy in your Google Calendar (for example a Preply lesson). Please choose a different time.' using errcode = 'P0001';
  end if;

  begin
    insert into public.bookings (student_id, starts_at, ends_at, subject, booked_by, credit_charged, consent_confirmed_at)
    values (p_student, p_starts_at, p_starts_at + make_interval(mins => v_mins), trim(p_subject), auth.uid(), coalesce(p_use_credit, true), now())
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'That time overlaps another lesson. Please choose a different time.' using errcode = 'P0001';
  end;

  if coalesce(p_use_credit, true) then
    insert into public.credit_ledger (student_id, delta, reason, booking_id, created_by)
    values (p_student, -1, 'booking', v_id, auth.uid());
  end if;

  if p_notify then
    v_tz := coalesce(nullif(v_stu.timezone, ''), 'UTC');
    begin
      v_when := to_char(p_starts_at at time zone v_tz, 'FMDay, FMDD FMMonth YYYY "at" HH24:MI');
    exception when others then
      v_tz := 'UTC';
      v_when := to_char(p_starts_at at time zone 'UTC', 'FMDay, FMDD FMMonth YYYY "at" HH24:MI');
    end;
    insert into public.chat_messages (student_id, sender_id, body)
    values (p_student, auth.uid(), format(
      'Hi %s, as agreed, I have booked your lesson for %s (%s time). A Google Meet link and calendar invite will arrive by email. If you need to change it, reply here or use My Lessons.',
      split_part(coalesce(nullif(v_stu.full_name, ''), 'there'), ' ', 1), v_when, v_tz));
  end if;

  return v_id;
end $$;

-- ───────── Applying what Google reported ─────────
-- The Edge Function only fetches from Google and hands the raw events here, so every decision lives in one
-- testable place. An event is "ours" (a website lesson) if it carries our booking tag or matches a stored event id.

create or replace function public._calendar_event_span(p_item jsonb, p_tz text, out s timestamptz, out e timestamptz, out all_day boolean)
language plpgsql immutable as $$
begin
  if p_item #>> '{start,dateTime}' is not null then
    s := (p_item #>> '{start,dateTime}')::timestamptz;
    e := (p_item #>> '{end,dateTime}')::timestamptz;
    all_day := false;
  else
    -- All-day events cover whole days in the tutor's own time zone.
    s := ((p_item #>> '{start,date}')::date)::timestamp at time zone p_tz;
    e := ((p_item #>> '{end,date}')::date)::timestamp at time zone p_tz;
    all_day := true;
  end if;
end $$;

create or replace function public._calendar_apply_one(p_item jsonb, p_log boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_tz      text := coalesce(public.setting_text('tutor_timezone'), 'Africa/Johannesburg');
  v_id      text := p_item->>'id';
  v_status  text := coalesce(p_item->>'status', 'confirmed');
  v_tag     uuid;
  v_ours    boolean := false;
  b         public.bookings;
  v_s timestamptz; v_e timestamptz; v_allday boolean;
  v_old     public.external_busy;
  v_source  text;
  v_summary text := nullif(left(coalesce(p_item->>'summary', ''), 200), '');
  v_when    text;
  v_n       integer;
begin
  if v_id is null then return 'ignored'; end if;

  -- Is this one of the website's own lesson events?
  begin v_tag := nullif(p_item #>> '{extendedProperties,private,bb_booking_id}', '')::uuid; exception when others then v_tag := null; end;
  select * into b from public.bookings where id = v_tag or google_event_id = v_id order by (id = v_tag) desc limit 1;
  v_ours := v_tag is not null or found;

  if v_ours then
    with d as (delete from public.external_busy where google_event_id = v_id returning 1) select count(*) into v_n from d;
    if b.id is not null then
      if v_status = 'cancelled' then
        if b.status = 'confirmed' and b.ends_at > now() then
          insert into public.booking_conflicts (booking_id, google_event_id, kind, detail)
          values (b.id, v_id, 'removed_in_calendar', 'This lesson was deleted from your Google Calendar, but it is still booked on the website.')
          on conflict (booking_id, kind, (coalesce(google_event_id, ''))) where (status = 'open') do nothing;
          return 'conflict';
        end if;
        return 'ours';
      end if;
      select s, e into v_s, v_e from public._calendar_event_span(p_item, v_tz);
      if b.status = 'confirmed' and b.ends_at > now() and v_s is distinct from b.starts_at then
        insert into public.booking_conflicts (booking_id, google_event_id, kind, detail)
        values (b.id, v_id, 'moved_in_calendar',
                format('The calendar event was moved to %s, but the website still shows %s.',
                       to_char(v_s at time zone v_tz, 'Dy DD Mon HH24:MI'), to_char(b.starts_at at time zone v_tz, 'Dy DD Mon HH24:MI')))
        on conflict (booking_id, kind, (coalesce(google_event_id, ''))) where (status = 'open') do nothing;
        return 'conflict';
      end if;
      -- Event and booking agree again: clear any earlier "out of step" warning.
      update public.booking_conflicts set status = 'resolved', resolved_at = now(), resolution = 'Cleared automatically: the calendar and the website agree again.'
       where booking_id = b.id and status = 'open' and kind in ('moved_in_calendar', 'removed_in_calendar');
    end if;
    return 'ours';
  end if;

  -- From here on: an event that belongs to someone else (Preply, personal, manual).
  select * into v_old from public.external_busy where google_event_id = v_id;

  if v_status = 'cancelled'
     or p_item->>'transparency' = 'transparent'                                    -- marked "free"
     or p_item->>'eventType' = 'workingLocation'
     or exists (select 1 from jsonb_array_elements(coalesce(p_item->'attendees', '[]'::jsonb)) a
                 where (a->>'self') = 'true' and a->>'responseStatus' = 'declined') then
    with d as (delete from public.external_busy where google_event_id = v_id returning 1) select count(*) into v_n from d;
    if v_old.google_event_id is not null then
      if p_log then
        insert into public.calendar_sync_log (kind, message, details)
        values ('busy_released', format('Time released: %s on %s is no longer busy.', coalesce(v_old.summary, 'a calendar event'),
                to_char(v_old.starts_at at time zone v_tz, 'Dy DD Mon HH24:MI')), jsonb_build_object('event', v_id));
      end if;
      return 'released';
    end if;
    return 'ignored';
  end if;

  select s, e, all_day into v_s, v_e, v_allday from public._calendar_event_span(p_item, v_tz);
  if v_s is null or v_e is null or v_e <= v_s then return 'ignored'; end if;

  v_source := case when (coalesce(p_item->>'summary', '') || ' ' || coalesce(p_item->>'description', '') || ' ' ||
                         coalesce(p_item #>> '{creator,email}', '') || ' ' || coalesce(p_item #>> '{organizer,email}', '') || ' ' ||
                         coalesce(p_item #>> '{source,url}', '') || ' ' || coalesce(p_item #>> '{source,title}', '')) ~* 'preply'
                   then 'preply' else 'other' end;

  insert into public.external_busy (google_event_id, starts_at, ends_at, summary, source, is_all_day)
  values (v_id, v_s, v_e, v_summary, v_source, v_allday)
  on conflict (google_event_id) do update
    set starts_at = excluded.starts_at, ends_at = excluded.ends_at, summary = excluded.summary,
        source = excluded.source, is_all_day = excluded.is_all_day, updated_at = now();

  v_when := to_char(v_s at time zone v_tz, 'Dy DD Mon HH24:MI') || '–' || to_char(v_e at time zone v_tz, 'HH24:MI');
  if v_old.google_event_id is null then
    if p_log then
      insert into public.calendar_sync_log (kind, message, details)
      values ('busy_added', format('New %s in your calendar: %s, %s. That time is now blocked on the website.',
              case when v_source = 'preply' then 'Preply lesson' else 'event' end, coalesce(v_summary, 'busy'), v_when), jsonb_build_object('event', v_id));
    end if;
    return 'added';
  elsif v_old.starts_at is distinct from v_s or v_old.ends_at is distinct from v_e then
    if p_log then
      insert into public.calendar_sync_log (kind, message, details)
      values ('busy_moved', format('Moved in your calendar: %s is now %s. The old time is open again; the new time is blocked.',
              coalesce(v_summary, 'an event'), v_when), jsonb_build_object('event', v_id));
    end if;
    return 'moved';
  end if;
  return 'unchanged';
end $$;

create or replace function public.calendar_apply_changes(p_items jsonb, p_full boolean, p_window_from timestamptz, p_window_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  v_res text;
  v_seen text[] := '{}';
  c_added int := 0; c_released int := 0; c_moved int := 0; c_conf int := 0; c_skip int := 0; c_swept int := 0;
  v_rec jsonb;
begin
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    begin
      if coalesce(it->>'status', 'confirmed') <> 'cancelled' and it->>'id' is not null then v_seen := v_seen || (it->>'id'); end if;
      v_res := public._calendar_apply_one(it, not p_full);
      if v_res = 'added' then c_added := c_added + 1;
      elsif v_res = 'released' then c_released := c_released + 1;
      elsif v_res = 'moved' then c_moved := c_moved + 1;
      elsif v_res = 'conflict' then c_conf := c_conf + 1; end if;
    exception when others then
      c_skip := c_skip + 1;
      insert into public.calendar_sync_log (kind, message, details)
      values ('info', 'Skipped one calendar event that could not be read.', jsonb_build_object('event', it->>'id', 'error', sqlerrm));
    end;
  end loop;

  -- A full pass lists everything in the window, so anything we hold in that window that Google no longer reports is gone.
  if p_full and p_window_from is not null and p_window_to is not null then
    with gone as (
      delete from public.external_busy x
       where x.starts_at < p_window_to and x.ends_at > p_window_from
         and x.google_event_id <> all (v_seen)
      returning x.google_event_id
    ) select count(*) into c_swept from gone;
    c_released := c_released + c_swept;
    if c_swept > 0 then
      insert into public.calendar_sync_log (kind, message) values ('busy_released', format('%s calendar event(s) were removed; their times are open again.', c_swept));
    end if;
  end if;

  perform public.calendar_reconcile();

  return jsonb_build_object('added', c_added, 'released', c_released, 'moved', c_moved, 'conflicts', c_conf, 'skipped', c_skip,
                            'busy_now', (select count(*) from public.external_busy));
end $$;

-- Finds website lessons that overlap external events, and clears warnings that no longer apply.
create or replace function public.calendar_reconcile()
returns void language plpgsql security definer set search_path = public as $$
declare v_tz text := coalesce(public.setting_text('tutor_timezone'), 'Africa/Johannesburg'); v_cleared integer;
begin
  with new_c as (
    insert into public.booking_conflicts (booking_id, google_event_id, kind, detail)
    select b.id, x.google_event_id, 'overlap',
           format('A website lesson (%s–%s) overlaps "%s" in your calendar (%s–%s)%s.',
                  to_char(b.starts_at at time zone v_tz, 'Dy DD Mon HH24:MI'), to_char(b.ends_at at time zone v_tz, 'HH24:MI'),
                  coalesce(x.summary, 'a busy event'),
                  to_char(x.starts_at at time zone v_tz, 'HH24:MI'), to_char(x.ends_at at time zone v_tz, 'HH24:MI'),
                  case when x.source = 'preply' then ' (a Preply lesson)' else '' end)
      from public.bookings b
      join public.external_busy x on tstzrange(b.starts_at, b.ends_at) && tstzrange(x.starts_at, x.ends_at)
     where b.status = 'confirmed' and b.ends_at > now()
    on conflict (booking_id, kind, (coalesce(google_event_id, ''))) where (status = 'open') do nothing
    returning booking_id, detail
  )
  insert into public.calendar_sync_log (kind, message, details)
  select 'conflict', 'Double booking found: ' || detail, jsonb_build_object('booking_id', booking_id) from new_c;

  update public.booking_conflicts c
     set status = 'resolved', resolved_at = now(), resolution = 'Cleared automatically: the clash no longer exists.'
   where c.status = 'open' and c.kind = 'overlap'
     and not exists (
       select 1 from public.bookings b
         join public.external_busy x on x.google_event_id = c.google_event_id
        where b.id = c.booking_id and b.status = 'confirmed' and b.ends_at > now()
          and tstzrange(b.starts_at, b.ends_at) && tstzrange(x.starts_at, x.ends_at));
  get diagnostics v_cleared = row_count;
  if v_cleared > 0 then
    insert into public.calendar_sync_log (kind, message)
    values ('conflict_cleared', 'A double booking was cleared: one of the two lessons moved or was cancelled.');
  end if;

  update public.booking_conflicts c
     set status = 'resolved', resolved_at = now(), resolution = 'Cleared automatically: that lesson is no longer upcoming.'
   where c.status = 'open' and c.kind in ('moved_in_calendar', 'removed_in_calendar')
     and not exists (select 1 from public.bookings b where b.id = c.booking_id and b.status = 'confirmed' and b.ends_at > now());
end $$;

create or replace function public.bookings_reconcile_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.calendar_reconcile();
  return new;
end $$;

drop trigger if exists bookings_reconcile_after on public.bookings;
create trigger bookings_reconcile_after after insert or update of status, starts_at on public.bookings
  for each row execute function public.bookings_reconcile_trigger();

-- ───────── Sync scheduling helpers (used by the Edge Function and cron) ─────────
create or replace function public.calendar_try_lock(p_seconds integer default 90)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_got boolean;
begin
  update public.calendar_sync_state set lock_until = now() + make_interval(secs => p_seconds)
   where id = 1 and (lock_until is null or lock_until < now())
  returning true into v_got;
  if v_got is null then
    update public.calendar_sync_state set rerun_requested_at = now() where id = 1;   -- someone is syncing: ask for one more pass
    return false;
  end if;
  return true;
end $$;

create or replace function public.calendar_unlock()
returns void language sql security definer set search_path = public as $$
  update public.calendar_sync_state set lock_until = null where id = 1
$$;

create or replace function public.calendar_sync_kick(p_action text default 'sync')
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_secret text;
begin
  if not exists (select 1 from public.google_credentials) then return; end if;     -- Google isn't connected
  select value into v_url    from public.app_secrets where key = 'calendar_sync_url';
  select value into v_secret from public.app_secrets where key = 'google_meet_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('action', p_action),
    timeout_milliseconds := 30000
  );
end $$;

create or replace function public.calendar_housekeeping()
returns void language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  with d as (delete from public.calendar_sync_log where at < now() - interval '60 days' returning 1) select count(*) into v_n from d;
  with d as (delete from public.external_busy where ends_at < now() - interval '2 days' returning 1) select count(*) into v_n from d;
end $$;

-- Disconnecting Google also forgets everything learned from it (and stops pausing bookings).
create or replace function public.admin_disconnect_google()
returns void language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  with d as (delete from public.google_credentials where id = 1 returning 1) select count(*) into v_n from d;
  with d as (delete from public.external_busy returning 1) select count(*) into v_n from d;
  update public.calendar_sync_state
     set sync_token = null, full_synced_at = null, enforced = false, last_error = null, consecutive_failures = 0, lock_until = null
   where id = 1;
  insert into public.calendar_sync_log (kind, message) values ('info', 'Google Calendar was disconnected.');
end $$;

-- ───────── Safety net for website → Google writes (new, moved and cancelled lessons) ─────────
create or replace function public.google_meet_backfill()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select id from public.bookings
     where (
             -- new lessons that never got an event / Meet link
             (status = 'confirmed' and starts_at > now() and meet_url is null
               and created_at < now() - interval '2 minutes'
               and (google_event_id is null or (google_event_id = 'pending' and google_sync_at < now() - interval '10 minutes')))
             -- moved lessons whose calendar update failed
          or (status = 'confirmed' and starts_at > now() and google_event_id is not null and google_event_id <> 'pending'
               and google_synced_starts_at is distinct from starts_at
               and coalesce(google_sync_at, created_at) < now() - interval '2 minutes')
             -- cancelled lessons whose calendar event is still there (it would keep blocking Preply)
          or (status = 'cancelled' and google_event_id is not null and google_event_id <> 'pending'
               and cancelled_at > now() - interval '14 days')
           )
     limit 20
  loop
    perform public.call_google_meet(r.id);
  end loop;
end $$;

select cron.unschedule('calendar-sync') where exists (select 1 from cron.job where jobname = 'calendar-sync');
select cron.schedule('calendar-sync', '*/2 * * * *', $$select public.calendar_sync_kick('sync')$$);
select cron.unschedule('calendar-housekeeping') where exists (select 1 from cron.job where jobname = 'calendar-housekeeping');
select cron.schedule('calendar-housekeeping', '30 3 * * *', $$select public.calendar_housekeeping()$$);

-- ───────── Tutor monitoring (read-only, plain data for the Calendar sync page) ─────────
create or replace function public.admin_calendar_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.calendar_sync_state; v_connected boolean; v_email text; v_health text;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into s from public.calendar_sync_state where id = 1;
  select true, account_email into v_connected, v_email from public.google_credentials where id = 1;
  v_connected := coalesce(v_connected, false);
  v_health := case
    when not v_connected then 'not_connected'
    when s.last_success_at is null then 'starting'
    when s.last_success_at < now() - interval '15 minutes' then 'down'
    when s.consecutive_failures > 0 then 'warning'
    else 'ok' end;
  return jsonb_build_object(
    'connected', v_connected, 'account_email', v_email, 'health', v_health,
    'enforced', s.enforced, 'paused', not coalesce((public.calendar_availability_status()->>'ok')::boolean, true),
    'last_success_at', s.last_success_at, 'last_attempt_at', s.last_attempt_at,
    'last_error', s.last_error, 'last_error_at', s.last_error_at, 'failures', s.consecutive_failures,
    'open_conflicts', (select count(*) from public.booking_conflicts where status = 'open'),
    'failed_writes', (select count(*) from public.admin_calendar_failed_writes()),
    'external_upcoming', (select count(*) from public.external_busy where ends_at > now()),
    'website_upcoming', (select count(*) from public.bookings where status = 'confirmed' and ends_at > now()));
end $$;

create or replace function public.admin_external_busy(p_days integer default 21)
returns table (google_event_id text, starts_at timestamptz, ends_at timestamptz, summary text, source text, is_all_day boolean, clashes boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select x.google_event_id, x.starts_at, x.ends_at, x.summary, x.source, x.is_all_day,
           exists (select 1 from public.bookings b where b.status = 'confirmed' and b.ends_at > now()
                    and tstzrange(b.starts_at, b.ends_at) && tstzrange(x.starts_at, x.ends_at))
      from public.external_busy x
     where x.ends_at > now() and x.starts_at < now() + make_interval(days => p_days)
     order by x.starts_at;
end $$;

create or replace function public.admin_calendar_conflicts()
returns table (id uuid, kind text, detail text, detected_at timestamptz, booking_id uuid, student_name text,
               booking_starts_at timestamptz, booking_ends_at timestamptz, event_summary text,
               event_starts_at timestamptz, event_ends_at timestamptz, event_source text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select c.id, c.kind, c.detail, c.detected_at, b.id, coalesce(nullif(p.full_name, ''), p.email),
           b.starts_at, b.ends_at, x.summary, x.starts_at, x.ends_at, x.source
      from public.booking_conflicts c
      join public.bookings b on b.id = c.booking_id
      join public.profiles p on p.id = b.student_id
      left join public.external_busy x on x.google_event_id = c.google_event_id
     where c.status = 'open'
     order by b.starts_at;
end $$;

create or replace function public.admin_calendar_failed_writes()
returns table (booking_id uuid, student_name text, starts_at timestamptz, status text, problem text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select q.id, q.name, q.starts_at, q.status, q.problem from (
      select b.id, coalesce(nullif(p.full_name, ''), p.email) as name, b.starts_at, b.status::text as status,
             case
               when b.status = 'confirmed' and (b.google_event_id is null or b.google_event_id = 'pending')
                    and b.created_at < now() - interval '3 minutes' then 'This lesson is not in your Google Calendar yet.'
               when b.status = 'confirmed' and b.google_event_id is not null and b.google_event_id <> 'pending'
                    and b.google_synced_starts_at is distinct from b.starts_at
                    and coalesce(b.google_sync_at, b.created_at) < now() - interval '3 minutes' then 'Your calendar still shows the old time for this lesson.'
               when b.status = 'cancelled' and b.google_event_id is not null and b.google_event_id <> 'pending'
                    then 'This lesson was cancelled but its event is still in your Google Calendar.'
             end as problem
        from public.bookings b join public.profiles p on p.id = b.student_id
       where exists (select 1 from public.google_credentials)
         and ((b.status = 'confirmed' and b.ends_at > now()) or (b.status = 'cancelled' and b.cancelled_at > now() - interval '14 days'))
    ) q where q.problem is not null order by q.starts_at;
end $$;

create or replace function public.admin_calendar_log(p_limit integer default 40)
returns table (at timestamptz, kind text, message text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query select l.at, l.kind, l.message from public.calendar_sync_log l order by l.at desc, l.id desc limit least(greatest(p_limit, 1), 200);
end $$;

create or replace function public.admin_resolve_conflict(p_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.booking_conflicts
     set status = 'resolved', resolved_at = now(), resolved_by = auth.uid(), resolution = coalesce(nullif(trim(p_note), ''), 'Marked as sorted by the tutor.')
   where id = p_id and status = 'open';
  insert into public.calendar_sync_log (kind, message, details) values ('conflict_resolved', 'You marked a calendar clash as sorted.', jsonb_build_object('conflict', p_id));
end $$;

-- Push a lesson to Google again (fixes a missing event, an old time, or a cancelled lesson that was never removed).
create or replace function public.admin_resync_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  perform public.call_google_meet(p_booking_id);
end $$;

create or replace function public.admin_request_calendar_sync(p_full boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  perform public.calendar_sync_kick(case when p_full then 'full' else 'sync' end);
end $$;

-- ───────── Permissions ─────────
revoke execute on function
  public.bookings_audit_trigger(), public.bookings_reconcile_trigger(), public.calendar_reconcile(),
  public._calendar_event_span(jsonb, text), public._calendar_apply_one(jsonb, boolean),
  public.calendar_apply_changes(jsonb, boolean, timestamptz, timestamptz), public.calendar_try_lock(integer), public.calendar_unlock(),
  public.calendar_sync_kick(text), public.calendar_housekeeping()
  from public, anon, authenticated;
grant execute on function public.calendar_apply_changes(jsonb, boolean, timestamptz, timestamptz), public.calendar_try_lock(integer), public.calendar_unlock() to service_role;

revoke execute on function public.calendar_availability_status() from public, anon;
grant execute on function public.calendar_availability_status() to authenticated;

revoke execute on function
  public.admin_calendar_overview(), public.admin_external_busy(integer), public.admin_calendar_conflicts(),
  public.admin_calendar_failed_writes(), public.admin_calendar_log(integer), public.admin_resolve_conflict(uuid, text),
  public.admin_resync_booking(uuid), public.admin_request_calendar_sync(boolean)
  from public, anon;
grant execute on function
  public.admin_calendar_overview(), public.admin_external_busy(integer), public.admin_calendar_conflicts(),
  public.admin_calendar_failed_writes(), public.admin_calendar_log(integer), public.admin_resolve_conflict(uuid, text),
  public.admin_resync_booking(uuid), public.admin_request_calendar_sync(boolean)
  to authenticated;

commit;
