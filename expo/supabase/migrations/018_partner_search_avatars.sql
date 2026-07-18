-- Partner search avatars + fix read-only transaction on list_my_friend_profiles.
-- Run AFTER 017_plan_rls_recursion_fix.sql. Safe to re-run (idempotent).

-- list_my_friend_profiles was STABLE but called repair_friendship_links() (INSERT),
-- causing: "cannot execute INSERT in a read-only transaction".
-- Repair runs separately from the app before listing partners.
create or replace function public.list_my_friend_profiles()
returns setof public.profiles
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  return query
    select p.*
    from public.friendships f
    join public.profiles p on p.id = f.friend_id
    where f.user_id = auth.uid()
      and not public.is_blocked_with(p.id)
    order by p.username;
end;
$$;
revoke all on function public.list_my_friend_profiles() from public;
grant execute on function public.list_my_friend_profiles() to authenticated;

-- Include avatar + display name in discovery search (security definer bypasses profile RLS).
drop function if exists public.search_profiles(text, int);
create or replace function public.search_profiles(p_query text, p_limit int default 20)
returns table (id uuid, username citext, display_name text, avatar_url text)
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
  if not public.can_use_social(uid) then raise exception 'social not available for this account'; end if;

  q := lower(trim(coalesce(p_query, '')));
  q := regexp_replace(q, '^@', '');
  if length(q) < 2 then return; end if;
  if length(q) > 40 then q := left(q, 40); end if;

  lim := greatest(1, least(coalesce(p_limit, 20), 20));

  select search_count, window_start into cnt, win
    from public.profile_search_rate where user_id = uid;

  if not found then
    insert into public.profile_search_rate (user_id, window_start, search_count)
      values (uid, now(), 1);
  elsif win < now() - interval '10 minutes' then
    update public.profile_search_rate
      set window_start = now(), search_count = 1 where user_id = uid;
  elsif cnt >= 30 then
    raise exception 'rate limit exceeded' using errcode = 'PGRST';
  else
    update public.profile_search_rate
      set search_count = search_count + 1 where user_id = uid;
  end if;

  return query
    select p.id, p.username, p.display_name, p.avatar_url
    from public.profiles p
    where p.id <> uid
      and not public.is_blocked_with(p.id)
      and p.username::text ilike '%' || q || '%'
    order by p.username
    limit lim;
end;
$$;
revoke all on function public.search_profiles(text, int) from public;
grant execute on function public.search_profiles(text, int) to authenticated;

drop function if exists public.lookup_profile_username(text);
create or replace function public.lookup_profile_username(p_username text)
returns table (id uuid, username citext, display_name text, avatar_url text)
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
    select p.id, p.username, p.display_name, p.avatar_url
    from public.profiles p
    where p.id <> uid
      and p.username = u::citext
    limit 1;
end;
$$;
revoke all on function public.lookup_profile_username(text) from public;
grant execute on function public.lookup_profile_username(text) to authenticated;
