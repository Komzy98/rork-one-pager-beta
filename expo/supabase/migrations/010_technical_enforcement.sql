-- Layer 4 — Technical enforcement (backend privacy)
-- Run AFTER 009_social_privacy.sql. Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- 1) Activity writes: block inserts when profile visibility is private
-- ---------------------------------------------------------------------------
drop policy if exists "ae_insert_own" on public.activity_events;
create policy "ae_insert_own" on public.activity_events
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.activity_visibility <> 'private'
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Profiles RLS — full row only for self, friends, or pending request parties
--    Discovery/search goes through rate-limited RPCs (id + username only).
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_friends" on public.profiles;
drop policy if exists "profiles_select_request_party" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_select_friends" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = profiles.id
    )
  );

create policy "profiles_select_request_party" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.friend_requests fr
      where fr.status = 'pending'
        and (
          (fr.from_user = auth.uid() and fr.to_user = profiles.id)
          or (fr.to_user = auth.uid() and fr.from_user = profiles.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Rate-limited profile search (id + username only)
-- ---------------------------------------------------------------------------
create table if not exists public.profile_search_rate (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  search_count int not null default 0
);

alter table public.profile_search_rate enable row level security;
-- No direct client access; RPC is security definer.

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

-- ---------------------------------------------------------------------------
-- 4) Event plans — invite tokens + grants (replaces global event plan read)
-- ---------------------------------------------------------------------------
alter table public.shared_plans
  add column if not exists invite_token text unique
    default encode(gen_random_bytes(16), 'hex');

update public.shared_plans
  set invite_token = encode(gen_random_bytes(16), 'hex')
  where invite_token is null;

alter table public.shared_plans
  alter column invite_token set not null;

create table if not exists public.plan_access_grants (
  plan_id uuid not null references public.shared_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create index if not exists idx_plan_access_grants_user on public.plan_access_grants (user_id);

alter table public.plan_access_grants enable row level security;

drop policy if exists "pag_select_own" on public.plan_access_grants;
create policy "pag_select_own" on public.plan_access_grants
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.claim_plan_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  t text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  t := trim(coalesce(p_token, ''));
  if length(t) < 8 then raise exception 'invalid token'; end if;

  select sp.id into v_plan_id
    from public.shared_plans sp
    where sp.invite_token = t
    limit 1;

  if not found then raise exception 'plan not found'; end if;

  insert into public.plan_access_grants (plan_id, user_id)
    values (v_plan_id, auth.uid())
    on conflict do nothing;

  return v_plan_id;
end;
$$;
revoke all on function public.claim_plan_invite(text) from public;
grant execute on function public.claim_plan_invite(text) to authenticated;

-- Co-attendees on a shared plan the viewer can already access (Who's going).
-- Must run AFTER plan_access_grants exists (referenced in policy).
drop policy if exists "profiles_select_plan_coparticipant" on public.profiles;
create policy "profiles_select_plan_coparticipant" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.plan_rsvps viewer
      join public.plan_rsvps attendee on attendee.plan_id = viewer.plan_id
      join public.shared_plans sp on sp.id = viewer.plan_id
      where viewer.user_id = auth.uid()
        and attendee.user_id = profiles.id
        and (
          sp.owner_id = auth.uid()
          or exists (
            select 1 from public.plan_access_grants g
            where g.plan_id = sp.id and g.user_id = auth.uid()
          )
          or exists (
            select 1 from public.profiles owner_p
            where owner_p.id = sp.owner_id
              and owner_p.activity_visibility <> 'private'
              and (
                owner_p.activity_visibility = 'public'
                or exists (
                  select 1 from public.friendships f
                  where f.user_id = auth.uid() and f.friend_id = sp.owner_id
                )
              )
          )
        )
    )
  );

-- Replace 007's "any authenticated user can read all event plans" policy.
drop policy if exists "sp_select_visible" on public.shared_plans;
create policy "sp_select_visible" on public.shared_plans
  for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.plan_rsvps r
      where r.plan_id = shared_plans.id and r.user_id = auth.uid()
    )
    or exists (
      select 1 from public.plan_access_grants g
      where g.plan_id = shared_plans.id and g.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = shared_plans.owner_id
        and p.activity_visibility <> 'private'
        and (
          p.activity_visibility = 'public'
          or exists (
            select 1 from public.friendships f
            where f.user_id = auth.uid() and f.friend_id = shared_plans.owner_id
          )
        )
    )
  );

drop policy if exists "pr_select_visible" on public.plan_rsvps;
create policy "pr_select_visible" on public.plan_rsvps
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.shared_plans sp
      where sp.id = plan_rsvps.plan_id
        and (
          sp.owner_id = auth.uid()
          or exists (
            select 1 from public.plan_access_grants g
            where g.plan_id = sp.id and g.user_id = auth.uid()
          )
          or exists (
            select 1 from public.profiles p
            where p.id = sp.owner_id
              and p.activity_visibility <> 'private'
              and (
                p.activity_visibility = 'public'
                or exists (
                  select 1 from public.friendships f
                  where f.user_id = auth.uid() and f.friend_id = sp.owner_id
                )
              )
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Nudges — honor block_nudges at the database layer
-- ---------------------------------------------------------------------------
drop policy if exists "nudges_insert_friend" on public.nudges;
create policy "nudges_insert_friend" on public.nudges
  for insert to authenticated
  with check (
    auth.uid() = from_user
    and exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = to_user
    )
    and not exists (
      select 1 from public.profiles p
      where p.id = to_user and p.block_nudges = true
    )
  );

-- ---------------------------------------------------------------------------
-- 6) RPC audit — visibility must never be bypassed accidentally
--    accept_friend_request / reject_friend_request / remove_friend:
--      only mutate requests/friendships; no profile or activity reads.
--    toggle_community_save / toggle_community_like:
--      habit stats only; no social visibility surface.
--    can_see_event / toggle_cheer: re-assert private + friends-only rules.
-- ---------------------------------------------------------------------------
create or replace function public.can_see_event(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.activity_events e
    join public.profiles p on p.id = e.user_id
    where e.id = p_event_id
      and (
        e.user_id = auth.uid()
        or (
          p.activity_visibility = 'public'
          or (
            p.activity_visibility = 'friends'
            and exists (
              select 1 from public.friendships f
              where f.user_id = auth.uid() and f.friend_id = e.user_id
            )
          )
        )
      )
  );
$$;

create or replace function public.toggle_cheer(p_event_id uuid, p_on boolean)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
  total int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_see_event(p_event_id) then
    raise exception 'not authorized';
  end if;

  if p_on then
    insert into public.activity_reactions (event_id, user_id)
      values (p_event_id, auth.uid())
      on conflict (event_id, user_id) do nothing;
    get diagnostics affected = row_count;
    if affected > 0 then
      update public.activity_events
        set cheers_count = cheers_count + 1
        where id = p_event_id;
    end if;
  else
    delete from public.activity_reactions
      where event_id = p_event_id and user_id = auth.uid();
    get diagnostics affected = row_count;
    if affected > 0 then
      update public.activity_events
        set cheers_count = greatest(cheers_count - 1, 0)
        where id = p_event_id;
    end if;
  end if;

  select cheers_count into total from public.activity_events where id = p_event_id;
  return coalesce(total, 0);
end;
$$;
revoke all on function public.toggle_cheer(uuid, boolean) from public;
grant execute on function public.toggle_cheer(uuid, boolean) to authenticated;
