-- Contact form: visitors (signed in or not) send a message, only the tutor can read them.
-- Run AFTER 20261006000700_paypal.sql.

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Only the tutor can read, mark as read, or delete. Nobody inserts directly: they go through the function below.
drop policy if exists contact_admin on public.contact_messages;
create policy contact_admin on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

-- The public entry point. Validates, rate-limits and stores the message.
-- p_website is a hidden "honeypot" field: real people leave it empty, simple spam bots fill it in.
create or replace function public.send_contact_message(
  p_name text, p_email text, p_subject text, p_message text, p_website text default ''
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_subject text := btrim(coalesce(p_subject, ''));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if btrim(coalesce(p_website, '')) <> '' then return true; end if;   -- looks like a bot: pretend it worked, store nothing

  if char_length(v_name) < 1 or char_length(v_name) > 100 then raise exception 'Please enter your name.' using errcode = '22023'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'Please enter a valid email address.' using errcode = '22023'; end if;
  if char_length(v_subject) < 1 or char_length(v_subject) > 100 then raise exception 'Please choose a subject.' using errcode = '22023'; end if;
  if char_length(v_message) < 5 then raise exception 'Please write a short message.' using errcode = '22023'; end if;
  if char_length(v_message) > 4000 then raise exception 'Your message is too long (4000 characters at most).' using errcode = '22023'; end if;

  -- Rate limits: a few per person per hour, and an overall cap so the inbox can't be flooded.
  if (select count(*) from public.contact_messages where email = v_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'You have sent a few messages already. Please wait a while before sending another.' using errcode = '54000';
  end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Too many messages right now. Please try again later.' using errcode = '54000';
  end if;

  insert into public.contact_messages (name, email, subject, message) values (v_name, v_email, v_subject, v_message);
  return true;
end $$;

revoke all on function public.send_contact_message(text, text, text, text, text) from public;
grant execute on function public.send_contact_message(text, text, text, text, text) to anon, authenticated;
