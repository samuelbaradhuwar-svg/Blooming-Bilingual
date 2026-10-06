-- Tutor dashboard support: student emails, overview, lesson completion, Meet links.
-- Run AFTER 20261006000000_init.sql.

-- ───────── Emails on profiles (so the tutor can see who's who) ─────────
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, country, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'country',
    new.email
  );
  return new;
end $$;

-- ───────── Student overview (tutor only) ─────────
create or replace function public.admin_student_overview()
returns table (
  id uuid, full_name text, email text, country text, timezone text, created_at timestamptz,
  credits integer, lessons_booked integer, next_lesson timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.email, p.country, p.timezone, p.created_at,
           coalesce((select sum(l.delta) from public.credit_ledger l where l.student_id = p.id), 0)::integer,
           (select count(*) from public.bookings b where b.student_id = p.id and b.status <> 'cancelled')::integer,
           (select min(b.starts_at) from public.bookings b
              where b.student_id = p.id and b.status = 'confirmed' and b.ends_at > now())
    from public.profiles p
    where p.role = 'student'
    order by p.created_at desc;
end $$;

-- ───────── Mark a lesson completed (tutor only) ─────────
create or replace function public.admin_complete_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.bookings set status = 'completed'
   where id = p_booking_id and status = 'confirmed' and starts_at < now();
  if not found then raise exception 'Only lessons that have already started can be completed.'; end if;
end $$;

-- ───────── Attach a Google Meet / video link (tutor only) ─────────
create or replace function public.admin_set_meet_url(p_booking_id uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_url is not null and p_url !~* '^https://' then raise exception 'The link must start with https://'; end if;
  update public.bookings set meet_url = nullif(trim(p_url), '') where id = p_booking_id;
end $$;

revoke execute on function public.admin_student_overview(), public.admin_complete_booking(uuid),
  public.admin_set_meet_url(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_student_overview(), public.admin_complete_booking(uuid),
  public.admin_set_meet_url(uuid, text) to authenticated;
