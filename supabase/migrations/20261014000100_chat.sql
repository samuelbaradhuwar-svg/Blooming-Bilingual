-- Student <-> tutor chat. One private conversation per student; the tutor can see all of them.
-- Run AFTER 20261014000000_contact_messages.sql.

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,   -- whose conversation this is
  sender_id  uuid not null references public.profiles(id) on delete cascade,   -- the student or the tutor
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz                                                       -- when the other person read it
);
create index if not exists chat_messages_thread_idx on public.chat_messages (student_id, created_at);
create index if not exists chat_messages_unread_idx on public.chat_messages (student_id) where read_at is null;

alter table public.chat_messages enable row level security;

-- Read: a student sees only their own conversation; the tutor sees all.
drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages for select using (student_id = auth.uid() or public.is_admin());

-- Nobody writes to the table directly. Sending and marking-as-read go through the functions below,
-- so messages can't be edited, deleted, forged as someone else, or sent into another student's chat.
revoke insert, update, delete on public.chat_messages from anon, authenticated;

-- ── Send a message ──
-- A student always writes into their own conversation. The tutor must say which student.
create or replace function public.send_chat_message(p_body text, p_student_id uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in.' using errcode = '42501'; end if;

  if public.is_admin() then
    if p_student_id is null then raise exception 'Choose a student to message.' using errcode = '22023'; end if;
    if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
      raise exception 'That student could not be found.' using errcode = '22023';
    end if;
    v_student := p_student_id;
  else
    v_student := auth.uid();
  end if;

  if char_length(v_body) < 1 then raise exception 'Please write a message first.' using errcode = '22023'; end if;
  if char_length(v_body) > 2000 then raise exception 'Messages can be up to 2000 characters.' using errcode = '22023'; end if;

  -- Gentle rate limit so nobody can flood a conversation.
  if (select count(*) from public.chat_messages where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages very quickly. Please wait a moment.' using errcode = '54000';
  end if;

  insert into public.chat_messages (student_id, sender_id, body) values (v_student, auth.uid(), v_body) returning id into v_id;
  return v_id;
end $$;

-- ── Mark the other person's messages as read ──
create or replace function public.mark_chat_read(p_student_id uuid default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid;
  v_n integer;
begin
  if auth.uid() is null then return 0; end if;
  v_student := case when public.is_admin() then p_student_id else auth.uid() end;
  if v_student is null then return 0; end if;
  update public.chat_messages set read_at = now()
   where student_id = v_student and sender_id <> auth.uid() and read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ── How many unread messages do I have? (student: from the tutor; tutor: from any student) ──
create or replace function public.chat_unread_count()
returns integer
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then 0
    when public.is_admin() then (select count(*)::integer from public.chat_messages where sender_id = student_id and read_at is null)
    else (select count(*)::integer from public.chat_messages where student_id = auth.uid() and sender_id <> auth.uid() and read_at is null)
  end;
$$;

-- ── Tutor's inbox: one row per conversation, newest first ──
create or replace function public.chat_overview()
returns table (student_id uuid, full_name text, email text, last_body text, last_at timestamptz, last_from_student boolean, unread integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.email, l.body, l.created_at, (l.sender_id = l.student_id),
           (select count(*)::integer from public.chat_messages u where u.student_id = p.id and u.sender_id = u.student_id and u.read_at is null)
      from public.profiles p
      join lateral (select m.body, m.created_at, m.sender_id, m.student_id
                      from public.chat_messages m where m.student_id = p.id order by m.created_at desc limit 1) l on true
     order by l.created_at desc;
end $$;

revoke all on function public.send_chat_message(text, uuid) from public, anon;
revoke all on function public.mark_chat_read(uuid) from public, anon;
revoke all on function public.chat_unread_count() from public, anon;
revoke all on function public.chat_overview() from public, anon;
grant execute on function public.send_chat_message(text, uuid) to authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.chat_unread_count() to authenticated;
grant execute on function public.chat_overview() to authenticated;

-- Live updates: new messages appear without refreshing the page.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
