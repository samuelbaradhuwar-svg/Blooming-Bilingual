-- The Blooming Bilingual — initial schema, security rules and booking logic.
--
-- Principles
--   * Clients (students / tutor in the browser) NEVER write to credit_ledger,
--     orders or bookings directly. They call the functions at the bottom.
--   * Credits are an append-only ledger; the balance is SUM(delta).
--   * All times are timestamptz (UTC). Availability rules are expressed in the
--     tutor's timezone (settings.tutor_timezone) so DST is handled correctly.
--   * Row-level security is ON for every table. Default is "no access".

create extension if not exists btree_gist;

-- ───────────────────────────── Types ─────────────────────────────
create type public.user_role      as enum ('student', 'admin');
create type public.booking_status as enum ('confirmed', 'cancelled', 'completed');
create type public.order_status   as enum ('pending', 'paid', 'failed', 'refunded');
create type public.ledger_reason  as enum ('purchase', 'booking', 'refund', 'adjustment');

-- ───────────────────────────── Settings ─────────────────────────────
-- Business rules live in data so they can change without a deploy.
create table public.settings (
  key   text primary key,
  value jsonb not null
);

insert into public.settings (key, value) values
  ('tutor_timezone',     '"Africa/Johannesburg"'),  -- ASSUMPTION: confirm with Neeliën
  ('credit_rate_cents',  '1200'),                   -- €12 per credit
  ('currency',           '"eur"'),
  ('cancel_window_hours','2'),                      -- free cancel / reschedule if > 2h before
  ('lesson_minutes',     '45');

create or replace function public.setting_text(p_key text)
returns text language sql stable as $$
  select value #>> '{}' from public.settings where key = p_key
$$;

-- ───────────────────────────── Profiles ─────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text        not null default '',
  role       public.user_role not null default 'student',
  country    text,
  timezone   text        not null default 'UTC',
  created_at timestamptz not null default now()
);

-- Is the current user the tutor/admin? SECURITY DEFINER avoids RLS recursion
-- when policies on profiles call it.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Create a profile for every new auth user. Role is ALWAYS 'student' here:
-- user-supplied metadata is never trusted for privilege. Promote the tutor
-- manually (see bottom of file).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'country'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────── Packs ─────────────────────────────
create table public.packs (
  id             text primary key,
  label          text    not null,
  credits        integer not null check (credits > 0),
  price_cents    integer not null check (price_cents > 0),
  discount_pct   integer not null default 0 check (discount_pct between 0 and 100),
  badge          text,
  features       text[]  not null default '{}',
  sort_order     integer not null default 0,
  active         boolean not null default true
);

-- price = round(12 * credits * (1 - discount)) euros, matching the front end.
insert into public.packs (id, label, credits, price_cents, discount_pct, badge, features, sort_order) values
  ('A', 'Starter', 1,  1200,  0,  null,           '{"1 × 45-min lesson","Flexible scheduling","2hr reschedule policy"}', 1),
  ('B', 'Value',   8,  8800,  8,  'Most popular', '{"8 × 45-min lessons","Priority scheduling","Resource library access","Progress tracking"}', 2),
  ('C', 'Growth',  16, 15900, 17, null,           '{"16 × 45-min lessons","Resource library access","Mock test sessions","WhatsApp support"}', 3),
  ('D', 'Bloom',   28, 25200, 25, 'Best value',   '{"28 × 45-min lessons","Full monthly pace","Unlimited Q&A","Monthly progress report"}', 4);

-- ───────────────────────────── Orders ─────────────────────────────
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete restrict,
  pack_id       text not null references public.packs (id),
  credits       integer not null check (credits > 0),       -- snapshot at purchase time
  amount_cents  integer not null check (amount_cents > 0),  -- snapshot at purchase time
  currency      text not null default 'eur',
  provider      text not null check (provider in ('stripe', 'payfast')),
  provider_ref  text,                                       -- Stripe session id / PayFast payment id
  status        public.order_status not null default 'pending',
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create unique index orders_provider_ref_key on public.orders (provider, provider_ref) where provider_ref is not null;
create index orders_student_idx on public.orders (student_id, created_at desc);

-- ───────────────────────────── Bookings ─────────────────────────────
create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete restrict,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  subject       text not null,
  status        public.booking_status not null default 'confirmed',
  meet_url      text,
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  check (ends_at > starts_at)
);
-- One tutor => a confirmed lesson may never overlap another. This is what makes
-- double-booking impossible even under concurrent requests.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at) with &&) where (status in ('confirmed', 'completed'));
create index bookings_student_idx on public.bookings (student_id, starts_at desc);

-- ───────────────────────────── Credit ledger ─────────────────────────────
create table public.credit_ledger (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.profiles (id) on delete restrict,
  delta       integer not null check (delta <> 0),
  reason      public.ledger_reason not null,
  booking_id  uuid references public.bookings (id) on delete restrict,
  order_id    uuid references public.orders (id) on delete restrict,
  note        text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  -- A reason must carry the reference that explains it.
  check (reason not in ('booking', 'refund') or booking_id is not null),
  check (reason <> 'purchase' or order_id is not null)
);
-- Idempotency: one purchase credit per order, one charge and one refund per booking.
create unique index ledger_one_purchase_per_order on public.credit_ledger (order_id) where reason = 'purchase';
create unique index ledger_one_charge_per_booking on public.credit_ledger (booking_id) where reason = 'booking';
create unique index ledger_one_refund_per_booking on public.credit_ledger (booking_id) where reason = 'refund';
create index ledger_student_idx on public.credit_ledger (student_id, created_at desc);

-- Append-only: nobody (not even via SQL from the API) edits history.
create or replace function public.ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'credit_ledger is append-only';
end $$;
create trigger credit_ledger_no_update before update or delete on public.credit_ledger
  for each row execute function public.ledger_immutable();

create or replace function public.credit_balance(p_student uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::integer from public.credit_ledger where student_id = p_student
$$;

-- ───────────────────────────── Availability ─────────────────────────────
-- Weekly pattern in the tutor's local time. weekday: 0 = Sunday … 6 = Saturday.
create table public.availability_rules (
  id          bigint generated always as identity primary key,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time     not null,
  unique (weekday, start_time)
);
-- Mon–Sat, hourly starts 16:00–23:00.
-- NOTE: the old UI also offered 00:00; that is "midnight at the end of the day", which
-- needs a rule on the NEXT weekday at 00:00. Add rows here if Neeliën offers it.
insert into public.availability_rules (weekday, start_time)
select d, make_time(h, 0, 0) from generate_series(1, 6) d, generate_series(16, 23) h;

create table public.availability_exceptions (
  day     date primary key,        -- a date in the tutor's timezone with no lessons
  reason  text
);

-- ───────────────────────────── Resources & notes ─────────────────────────────
create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  uploader_id   uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  category      text,                          -- grammar, ielts, vocabulary, listening …
  storage_path  text,                          -- object path in the 'resources' bucket
  external_url  text,
  visibility    text not null default 'private' check (visibility in ('private', 'all_students')),
  created_at    timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create table public.lesson_notes (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  summary     text,
  homework    text,
  scores      jsonb not null default '{}',     -- e.g. {"grammar":78,"vocabulary":65}
  level       text,                            -- e.g. 'B2'
  created_at  timestamptz not null default now()
);

-- ═════════════════════════════ Row-level security ═════════════════════════════
alter table public.settings             enable row level security;
alter table public.profiles             enable row level security;
alter table public.packs                enable row level security;
alter table public.orders               enable row level security;
alter table public.bookings             enable row level security;
alter table public.credit_ledger        enable row level security;
alter table public.availability_rules   enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.resources            enable row level security;
alter table public.lesson_notes         enable row level security;

-- Start from nothing, then grant the minimum.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- settings & packs & availability: readable by everyone signed in (packs also public for the pricing page).
grant select on public.packs to anon, authenticated;
grant select on public.settings, public.availability_rules, public.availability_exceptions to authenticated;
create policy packs_read     on public.packs for select using (active or public.is_admin());
create policy settings_read  on public.settings for select to authenticated using (true);
create policy rules_read     on public.availability_rules for select to authenticated using (true);
create policy exc_read       on public.availability_exceptions for select to authenticated using (true);

-- Tutor manages packs, settings and availability.
grant insert, update, delete on public.packs, public.settings,
  public.availability_rules, public.availability_exceptions to authenticated;
create policy packs_admin  on public.packs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_admin on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy rules_admin  on public.availability_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy exc_admin    on public.availability_exceptions for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant usage on all sequences in schema public to authenticated;

-- profiles: read own (or all as admin). Users may edit ONLY name/country/timezone —
-- column-level grant means `role` can't be changed from the client.
grant select on public.profiles to authenticated;
grant update (full_name, country, timezone) on public.profiles to authenticated;
create policy profiles_read   on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- orders / bookings / ledger: read-only from the client. Writes go through functions.
grant select on public.orders, public.bookings, public.credit_ledger, public.lesson_notes to authenticated;
create policy orders_read   on public.orders        for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy bookings_read on public.bookings      for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy ledger_read   on public.credit_ledger for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy notes_read    on public.lesson_notes  for select to authenticated using (student_id = auth.uid() or public.is_admin());

-- lesson notes are written by the tutor.
grant insert, update, delete on public.lesson_notes to authenticated;
create policy notes_admin on public.lesson_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- resources: tutor sees/edits all. Students see the tutor's shared files and their own uploads,
-- may upload private files, and may delete their own.
grant select, insert, update, delete on public.resources to authenticated;
create policy resources_read on public.resources for select to authenticated
  using (public.is_admin() or uploader_id = auth.uid() or visibility = 'all_students');
create policy resources_insert on public.resources for insert to authenticated
  with check (public.is_admin() or (uploader_id = auth.uid() and visibility = 'private'));
create policy resources_update on public.resources for update to authenticated
  using (public.is_admin() or uploader_id = auth.uid())
  with check (public.is_admin() or (uploader_id = auth.uid() and visibility = 'private'));
create policy resources_delete on public.resources for delete to authenticated
  using (public.is_admin() or uploader_id = auth.uid());

-- ═════════════════════════════ Booking logic ═════════════════════════════

-- Open slot start times between two instants. SECURITY DEFINER so students can
-- see free times without being able to read other students' bookings.
create or replace function public.get_available_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select public.setting_text('tutor_timezone')                  as tz,
           public.setting_text('lesson_minutes')::int             as mins,
           public.setting_text('cancel_window_hours')::int        as notice_h
  ),
  days as (
    select d::date as day
    from cfg,
         generate_series((p_from at time zone cfg.tz)::date, (p_to at time zone cfg.tz)::date, interval '1 day') d
  ),
  candidates as (
    select ((days.day + r.start_time) at time zone cfg.tz) as s
    from days
    cross join cfg
    join public.availability_rules r on r.weekday = extract(dow from days.day)::int
    where not exists (select 1 from public.availability_exceptions e where e.day = days.day)
  )
  select c.s
  from candidates c, cfg
  where c.s >= p_from and c.s < p_to
    and c.s > now() + make_interval(hours => cfg.notice_h)          -- minimum notice
    and not exists (
      select 1 from public.bookings b
      where b.status in ('confirmed', 'completed')
        and tstzrange(b.starts_at, b.ends_at) && tstzrange(c.s, c.s + make_interval(mins => cfg.mins))
    )
  order by c.s
$$;

-- Book a lesson: checks the slot, takes 1 credit, creates the booking — all or nothing.
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

-- Cancel: credit is refunded when cancelling more than the cancel window ahead
-- (the tutor can always cancel and always refunds).
create or replace function public.cancel_booking(p_booking_id uuid)
returns boolean   -- true if a credit was refunded
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_admin();
  b public.bookings;
  v_refund boolean;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '28000'; end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (b.student_id <> v_uid and not v_admin) then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'confirmed' then raise exception 'Only confirmed bookings can be cancelled.'; end if;

  v_refund := v_admin
    or b.starts_at - now() > make_interval(hours => public.setting_text('cancel_window_hours')::int);

  update public.bookings set status = 'cancelled', cancelled_at = now() where id = b.id;

  if v_refund then
    insert into public.credit_ledger (student_id, delta, reason, booking_id, created_by)
    values (b.student_id, 1, 'refund', b.id, v_uid);
  end if;
  return v_refund;
end $$;

-- Reschedule: free, but only outside the cancel window. No credit moves.
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

-- Tutor adjusts a student's credits by hand (goodwill, corrections).
create or replace function public.admin_adjust_credits(p_student uuid, p_delta integer, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_delta = 0 then raise exception 'Adjustment cannot be zero'; end if;
  insert into public.credit_ledger (student_id, delta, reason, note, created_by)
  values (p_student, p_delta, 'adjustment', p_note, auth.uid());
end $$;

-- Called ONLY by the payment webhook (service role). Marks the order paid and
-- grants the credits exactly once, however many times the webhook retries.
create or replace function public.fulfill_order(p_order_id uuid, p_provider_ref text default null)
returns boolean   -- true if credits were granted by this call
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status = 'paid' then return false; end if;

  update public.orders
     set status = 'paid', paid_at = now(), provider_ref = coalesce(p_provider_ref, provider_ref)
   where id = o.id;

  insert into public.credit_ledger (student_id, delta, reason, order_id)
  values (o.student_id, o.credits, 'purchase', o.id);
  return true;
end $$;

-- Create a pending order for a pack at the CURRENT server-side price (the client
-- can never choose the amount). The payment function then creates the Stripe session.
create or replace function public.create_order(p_pack_id text, p_provider text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  p public.packs;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  select * into p from public.packs where id = p_pack_id and active;
  if not found then raise exception 'Unknown pack'; end if;
  insert into public.orders (student_id, pack_id, credits, amount_cents, currency, provider)
  values (v_uid, p.id, p.credits, p.price_cents, public.setting_text('currency'), p_provider)
  returning id into v_id;
  return v_id;
end $$;

-- Function permissions: nothing is callable by default.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;   -- anon: used by the packs policy (returns false)
grant execute on function public.setting_text(text) to authenticated;
grant execute on function public.credit_balance(uuid)            to authenticated;  -- see guard below
grant execute on function public.get_available_slots(timestamptz, timestamptz) to authenticated;
grant execute on function public.book_lesson(timestamptz, text)  to authenticated;
grant execute on function public.cancel_booking(uuid)            to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz) to authenticated;
grant execute on function public.admin_adjust_credits(uuid, integer, text) to authenticated;
grant execute on function public.create_order(text, text)        to authenticated;
-- fulfill_order is deliberately NOT granted to authenticated: service_role only.
grant execute on function public.fulfill_order(uuid, text)       to service_role;

-- credit_balance(uuid) is SECURITY DEFINER; restrict it so a student can only ask about themselves.
create or replace function public.my_credits()
returns integer language sql stable security definer set search_path = public as $$
  select public.credit_balance(auth.uid())
$$;
revoke execute on function public.credit_balance(uuid) from authenticated;
grant  execute on function public.my_credits() to authenticated;

-- ═════════════════════════════ Storage ═════════════════════════════
-- Private bucket; object path convention: <uploader_id>/<filename>.
insert into storage.buckets (id, name, public) values ('resources', 'resources', false)
on conflict (id) do nothing;

create policy resources_obj_read on storage.objects for select to authenticated
  using (
    bucket_id = 'resources' and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.resources r where r.storage_path = name and r.visibility = 'all_students')
    )
  );
create policy resources_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'resources' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy resources_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'resources' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

-- ═════════════════════════════ After deploying ═════════════════════════════
-- 1. Neeliën signs up normally, then run once in the Supabase SQL editor:
--      update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<her email>');
-- 2. Confirm settings.tutor_timezone and availability_rules match her real hours.
