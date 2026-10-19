-- Avatars: every person can pick a character as their picture.
-- Safe to run more than once. Does not change or remove anything that exists.

alter table public.profiles add column if not exists avatar text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_format') then
    alter table public.profiles add constraint profiles_avatar_format check (avatar is null or avatar ~ '^[a-z0-9_-]{1,40}$');
  end if;
end $$;

-- People may change their own avatar (the existing row policy already limits them to their own row).
grant update (avatar) on public.profiles to authenticated;

-- Students see the tutor's picture next to her messages.
create or replace function public.tutor_avatar()
returns text language sql stable security definer set search_path = public as $$
  select avatar from public.profiles where role = 'admin' order by created_at limit 1;
$$;
revoke all on function public.tutor_avatar() from public, anon;
grant execute on function public.tutor_avatar() to authenticated;

-- The tutor sees each student's chosen character, and how many lessons they have finished (which sets its level).
create or replace function public.admin_avatars()
returns table (student_id uuid, avatar text, lessons_done integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select p.id, p.avatar,
           (select count(*)::integer from public.bookings b
             where b.student_id = p.id and b.status in ('confirmed','completed') and b.ends_at < now())
      from public.profiles p
     where p.role = 'student';
end $$;
revoke all on function public.admin_avatars() from public, anon;
grant execute on function public.admin_avatars() to authenticated;
