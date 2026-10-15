-- The tutor can book a lesson for a student (with the student's agreement).
-- Run AFTER 20261015000000_tighten_table_grants.sql.
--
-- Double-booking stays impossible: the existing constraint bookings_no_overlap refuses any two lessons that overlap,
-- and get_available_slots() already hides every time that overlaps a booked lesson, so a booked slot disappears for students.

-- Who made the booking, whether a credit was used, and when the student's agreement was confirmed.
alter table public.bookings add column if not exists booked_by uuid references public.profiles(id) on delete set null;
alter table public.bookings add column if not exists credit_charged boolean not null default true;
alter table public.bookings add column if not exists consent_confirmed_at timestamptz;

-- Cancelling only returns a credit if the lesson actually used one (otherwise cancelling would hand out free credits).
create or replace function public.cancel_booking(p_booking_id uuid)
returns boolean
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

  v_refund := b.credit_charged
    and (v_admin or b.starts_at - now() > make_interval(hours => public.setting_text('cancel_window_hours')::int));

  update public.bookings set status = 'cancelled', cancelled_at = now() where id = b.id;

  if v_refund then
    insert into public.credit_ledger (student_id, delta, reason, booking_id, created_by)
    values (b.student_id, 1, 'refund', b.id, v_uid);
  end if;
  return v_refund;
end $$;

-- The tutor books a lesson for a student.
--   p_consent  must be true: the tutor confirms the student has agreed to this time.
--   p_use_credit  true = spend one of the student's credits (the normal case); false = no credit (arranged or paid outside the site).
--   p_notify   true = also send the student a chat message with the details (the Google Meet invite is sent by email as usual).
-- She may choose any future time, including outside her usual open hours; only overlapping another lesson is refused.
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

  -- Lock the student's row so two bookings can't spend the same last credit.
  select * into v_stu from public.profiles where id = p_student and role = 'student' for update;
  if not found then raise exception 'That student could not be found.' using errcode = 'P0001'; end if;

  if p_use_credit and public.credit_balance(p_student) < 1 then
    raise exception '% has no credits left. Add credits first, or book without using a credit.',
      coalesce(nullif(v_stu.full_name, ''), 'This student') using errcode = 'P0001';
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

revoke all on function public.admin_book_lesson(uuid, timestamptz, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_book_lesson(uuid, timestamptz, text, boolean, boolean, boolean) to authenticated;
