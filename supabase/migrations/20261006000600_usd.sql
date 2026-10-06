-- Prices are in US dollars. The numbers are unchanged (1 credit = 12.00, etc.); only the currency changes.
-- Run AFTER 20261006000500_google_url_from_db.sql.
begin;
update public.settings set value = '"usd"' where key = 'currency';
alter table public.orders alter column currency set default 'usd';
update public.orders set currency = 'usd' where currency = 'eur' and status = 'pending';
commit;
