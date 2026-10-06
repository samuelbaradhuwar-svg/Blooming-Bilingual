-- The function's web address is stored once, in app_secrets ('google_meet_url'), and read from there
-- by the site and the Edge Function — so it works whatever address Supabase assigned the function.
-- Run AFTER 20261006000400_google_meet.sql.

begin;

drop function if exists public.admin_start_google_connect();

-- Start "Connect Google": returns a one-time code AND the function's address (used as the OAuth redirect).
create function public.admin_start_google_connect()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_nonce text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_url   text;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select value into v_url from public.app_secrets where key = 'google_meet_url';
  if v_url is null then raise exception 'The Google Meet function address has not been saved yet.'; end if;
  delete from public.google_connect_nonces where expires_at < now();
  insert into public.google_connect_nonces (nonce, expires_at) values (v_nonce, now() + interval '10 minutes');
  return jsonb_build_object('nonce', v_nonce, 'redirect_uri', v_url);
end $$;

revoke execute on function public.admin_start_google_connect() from public, anon, authenticated;
grant execute on function public.admin_start_google_connect() to authenticated;

commit;
