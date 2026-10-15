-- Defence in depth for the newest tables. Supabase gives its public roles a few table-level
-- permissions by default (TRUNCATE, REFERENCES, TRIGGER, and SELECT for visitors who are not signed in).
-- None can be reached through the website's API, and row-level security already blocks reading, but nobody
-- needs them, so they are removed. Run AFTER 20261014000100_chat.sql.

-- Chat: signed-in people may only SELECT (row-level security limits which rows); writing goes through the functions.
revoke truncate, references, trigger on public.chat_messages from anon, authenticated;
revoke select on public.chat_messages from anon;

-- Contact form: visitors send through the send_contact_message() function only; only the tutor reads the table.
revoke all on public.contact_messages from anon;
revoke truncate, references, trigger on public.contact_messages from authenticated;
