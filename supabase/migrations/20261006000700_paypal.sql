-- PayPal checkout support. Run AFTER 20261006000600_usd.sql.
begin;

-- Orders may now be paid with PayPal.
alter table public.orders drop constraint if exists orders_provider_check;
alter table public.orders add constraint orders_provider_check check (provider in ('stripe', 'payfast', 'paypal'));

-- The Edge Function's address (not a secret) is stored in app_secrets ('paypal_function_url'); signed-in
-- students read it through this function, so the site never hard-codes it.
create or replace function public.payment_function_url()
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  return (select value from public.app_secrets where key = 'paypal_function_url');
end $$;

revoke execute on function public.payment_function_url() from public, anon, authenticated;
grant execute on function public.payment_function_url() to authenticated;

commit;
