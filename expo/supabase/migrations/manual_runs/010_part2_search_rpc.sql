-- Run 2/4 of 010_technical_enforcement.

create table if not exists public.profile_search_rate (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  search_count int not null default 0
);

alter table public.profile_search_rate enable row level security;

create or replace function public.search_profiles(p_query text, p_limit int default 20)
returns table (id uuid, username citext)
language plpgsql
security definer
set search_path = public
as $$
declare
  q text;
  lim int;
  uid uuid;
  cnt int;
  win timestamptz;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not authenticated'; end if;

  q := lower(trim(coalesce(p_query, '')));
  q := regexp_replace(q, '^@', '');
  if length(q) < 2 then return; end if;
  if length(q) > 40 then q := left(q, 40); end if;

  lim := greatest(1, least(coalesce(p_limit, 20), 20));

  select search_count, window_start
    into cnt, win
    from public.profile_search_rate
    where user_id = uid;

  if not found then
    insert into public.profile_search_rate (user_id, window_start, search_count)
      values (uid, now(), 1);
  elsif win < now() - interval '10 minutes' then
    update public.profile_search_rate
      set window_start = now(), search_count = 1
      where user_id = uid;
  elsif cnt >= 30 then
    raise exception 'rate limit exceeded' using errcode = 'PGRST';
  else
    update public.profile_search_rate
      set search_count = search_count + 1
      where user_id = uid;
  end if;

  return query
    select p.id, p.username
    from public.profiles p
    where p.id <> uid
      and p.username::text ilike '%' || q || '%'
    order by p.username
    limit lim;
end;
$$;
revoke all on function public.search_profiles(text, int) from public;
grant execute on function public.search_profiles(text, int) to authenticated;

create or replace function public.lookup_profile_username(p_username text)
returns table (id uuid, username citext)
language plpgsql
security definer
set search_path = public
as $$
declare
  u text;
  uid uuid;
  cnt int;
  win timestamptz;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not authenticated'; end if;

  u := lower(trim(coalesce(p_username, '')));
  u := regexp_replace(u, '^@', '');
  if length(u) < 2 then return; end if;

  select search_count, window_start
    into cnt, win
    from public.profile_search_rate
    where user_id = uid;

  if not found then
    insert into public.profile_search_rate (user_id, window_start, search_count)
      values (uid, now(), 1);
  elsif win < now() - interval '10 minutes' then
    update public.profile_search_rate
      set window_start = now(), search_count = 1
      where user_id = uid;
  elsif cnt >= 30 then
    raise exception 'rate limit exceeded' using errcode = 'PGRST';
  else
    update public.profile_search_rate
      set search_count = search_count + 1
      where user_id = uid;
  end if;

  return query
    select p.id, p.username
    from public.profiles p
    where p.id <> uid
      and p.username = u::citext
    limit 1;
end;
$$;
revoke all on function public.lookup_profile_username(text) from public;
grant execute on function public.lookup_profile_username(text) to authenticated;
