-- Talk: the anonymous play log, the public counter and the hourly limit.
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- It's safe to run again.
--
-- What's stored, and what isn't:
--   plays         one row per text read: time, option, voice engine, word count,
--                 typed or PDF, detected language. Never the text, audio, names or IPs.
--   recent_reads  for the hourly limit only: a scrambled (hashed) random ID the browser
--                 made for itself, and when it started a read. Rows older than an hour
--                 are deleted automatically.
--
-- Who can do what (row-level security):
--   The public can't read or write either table. The only thing anyone can read is the
--   total number of plays (plays_total). Talk's server uses the secret key to record
--   reads, through the functions below.

-- ---------- tables ----------

create table if not exists public.plays (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  option text not null,
  engine text not null,
  words integer not null check (words >= 0 and words <= 20000),
  input text not null check (input in ('text', 'pdf')),
  lang text
);

create table if not exists public.recent_reads (
  id bigint generated always as identity primary key,
  browser text not null,
  at timestamptz not null default now(),
  logged boolean not null default false
);
create index if not exists recent_reads_browser_at on public.recent_reads (browser, at);

alter table public.plays enable row level security;
alter table public.recent_reads enable row level security;
-- No policies on purpose: with row-level security on and no policies, the public
-- roles can't see or change any rows.
revoke all on public.plays from anon, authenticated;
revoke all on public.recent_reads from anon, authenticated;

-- ---------- the public counter ----------

create or replace function public.plays_total()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.plays;
$$;
revoke all on function public.plays_total() from public;
grant execute on function public.plays_total() to anon, authenticated, service_role;

-- ---------- the hourly limit (server only) ----------

-- Starts a read for a browser if it's under the limit for the last hour.
-- Returns whether it's allowed, a read id to log it with, and (if not allowed)
-- when the browser's next read unlocks.
create or replace function public.try_read(p_browser text, p_limit integer)
returns table (allowed boolean, read_id bigint, unlock_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  oldest timestamptz;
  new_id bigint;
begin
  delete from public.recent_reads where at < now() - interval '1 hour';
  select count(*), min(at) into n, oldest from public.recent_reads where browser = p_browser;
  if n >= p_limit then
    return query select false, null::bigint, oldest + interval '1 hour';
  else
    insert into public.recent_reads (browser) values (p_browser) returning id into new_id;
    return query select true, new_id, null::timestamptz;
  end if;
end;
$$;
revoke all on function public.try_read(text, integer) from public, anon, authenticated;
grant execute on function public.try_read(text, integer) to service_role;

-- Logs a play for a read that try_read allowed (once per read).
create or replace function public.log_play(
  p_read_id bigint,
  p_option text,
  p_engine text,
  p_words integer,
  p_input text,
  p_lang text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  found_id bigint;
begin
  update public.recent_reads set logged = true
    where id = p_read_id and logged = false
    returning id into found_id;
  if found_id is null then
    return false;
  end if;
  insert into public.plays (option, engine, words, input, lang)
    values (p_option, p_engine, p_words, p_input, p_lang);
  return true;
end;
$$;
revoke all on function public.log_play(bigint, text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.log_play(bigint, text, text, integer, text, text) to service_role;
