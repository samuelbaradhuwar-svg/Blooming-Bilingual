-- Student detail support: English level, tutor's plan for the next lesson, upload limits.
-- Run AFTER 20261006000100_admin.sql.

alter table public.profiles
  add column if not exists english_level text check (english_level in ('A1','A2','B1','B2','C1','C2')),
  add column if not exists next_lesson_focus text check (char_length(next_lesson_focus) <= 1000);

-- Tutor-only: set a student's level and the plan for their next lesson.
-- Students can READ these on their own profile but cannot change them
-- (the column-level UPDATE grant on profiles only covers name/country/timezone).
create or replace function public.admin_update_student(p_student uuid, p_level text, p_focus text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.profiles
     set english_level = nullif(trim(p_level), ''),
         next_lesson_focus = nullif(trim(p_focus), '')
   where id = p_student and role = 'student';
  if not found then raise exception 'Student not found.'; end if;
end $$;

revoke execute on function public.admin_update_student(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_student(uuid, text, text) to authenticated;

-- Add the level to the tutor's student list.
drop function if exists public.admin_student_overview();
create function public.admin_student_overview()
returns table (
  id uuid, full_name text, email text, country text, timezone text, created_at timestamptz,
  credits integer, lessons_booked integer, next_lesson timestamptz, english_level text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.email, p.country, p.timezone, p.created_at,
           coalesce((select sum(l.delta) from public.credit_ledger l where l.student_id = p.id), 0)::integer,
           (select count(*) from public.bookings b where b.student_id = p.id and b.status <> 'cancelled')::integer,
           (select min(b.starts_at) from public.bookings b
              where b.student_id = p.id and b.status = 'confirmed' and b.ends_at > now()),
           p.english_level
    from public.profiles p
    where p.role = 'student'
    order by p.created_at desc;
end $$;
revoke execute on function public.admin_student_overview() from public, anon, authenticated;
grant execute on function public.admin_student_overview() to authenticated;

-- Uploads: 10 MB per file.
update storage.buckets set file_size_limit = 10485760 where id = 'resources';
