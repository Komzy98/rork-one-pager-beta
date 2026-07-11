-- Layer 5 — Transparency & compliance (block, report, age gate)
-- Run AFTER 010_technical_enforcement.sql. Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- Age / consent (optional columns — synced from app profile)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists birth_year int;

alter table public.profiles
  add column if not exists parental_social_consent boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_birth_year_check'
  ) then
    alter table public.profiles
      add constraint profiles_birth_year_check
      check (birth_year is null or (birth_year >= 1900 and birth_year <= 2100));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Partner blocks & reports
-- ---------------------------------------------------------------------------
create table if not exists public.partner_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists idx_partner_blocks_blocked on public.partner_blocks (blocked_id);

alter table public.partner_blocks enable row level security;

drop policy if exists "pb_select_own" on public.partner_blocks;
create policy "pb_select_own" on public.partner_blocks
  for select to authenticated
  using (blocker_id = auth.uid());

create table if not exists public.partner_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 80),
  details text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index if not exists idx_partner_reports_reported on public.partner_reports (reported_id, created_at desc);

alter table public.partner_reports enable row level security;

drop policy if exists "pr_select_own" on public.partner_reports;
create policy "pr_select_own" on public.partner_reports
  for select to authenticated
  using (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.partner_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = auth.uid())
  );
$$;
revoke all on function public.is_blocked_with(uuid) from public;
grant execute on function public.is_blocked_with(uuid) to authenticated;

create or replace function public.can_use_social(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when p.birth_year is null then true
        when (extract(year from now())::int - p.birth_year) < 13 then false
        when (extract(year from now())::int - p.birth_year) < 16
          and p.parental_social_consent is not true then false
        else true
      end
      from public.profiles p
      where p.id = p_user_id
    ),
    true
  );
$$;
revoke all on function public.can_use_social(uuid) from public;
grant execute on function public.can_use_social(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Block / report RPCs (also sever friendship)
-- ---------------------------------------------------------------------------
create or replace function public.block_partner(p_other_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_other_user is null or p_other_user = auth.uid() then raise exception 'invalid user'; end if;

  insert into public.partner_blocks (blocker_id, blocked_id)
    values (auth.uid(), p_other_user)
    on conflict do nothing;

  perform public.remove_friend(p_other_user);
end;
$$;
revoke all on function public.block_partner(uuid) from public;
grant execute on function public.block_partner(uuid) to authenticated;

create or replace function public.report_partner(
  p_other_user uuid,
  p_reason text,
  p_details text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_other_user is null or p_other_user = auth.uid() then raise exception 'invalid user'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'reason required'; end if;

  insert into public.partner_reports (reporter_id, reported_id, reason, details)
    values (auth.uid(), p_other_user, trim(p_reason), nullif(trim(p_details), ''));
end;
$$;
revoke all on function public.report_partner(uuid, text, text) from public;
grant execute on function public.report_partner(uuid, text, text) to authenticated;

create or replace function public.delete_my_activity_history()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.activity_events where user_id = auth.uid();
  get diagnostics removed = row_count;
  delete from public.user_event_saves where user_id = auth.uid();
  return removed;
end;
$$;
revoke all on function public.delete_my_activity_history() from public;
grant execute on function public.delete_my_activity_history() to authenticated;

-- ---------------------------------------------------------------------------
-- Tighten RLS — blocks cut read/write immediately
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_friends" on public.profiles;
create policy "profiles_select_friends" on public.profiles
  for select to authenticated
  using (
    not public.is_blocked_with(profiles.id)
    and exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = profiles.id
    )
  );

drop policy if exists "profiles_select_request_party" on public.profiles;
create policy "profiles_select_request_party" on public.profiles
  for select to authenticated
  using (
    not public.is_blocked_with(profiles.id)
    and exists (
      select 1 from public.friend_requests fr
      where fr.status = 'pending'
        and (
          (fr.from_user = auth.uid() and fr.to_user = profiles.id)
          or (fr.to_user = auth.uid() and fr.from_user = profiles.id)
        )
    )
  );

drop policy if exists "ae_select_visible" on public.activity_events;
create policy "ae_select_visible" on public.activity_events
  for select to authenticated
  using (
    not public.is_blocked_with(activity_events.user_id)
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = activity_events.user_id
          and (
            p.activity_visibility = 'public'
            or (
              p.activity_visibility = 'friends'
              and exists (
                select 1 from public.friendships f
                where f.user_id = auth.uid() and f.friend_id = activity_events.user_id
              )
            )
          )
      )
    )
  );

drop policy if exists "fr_insert_sender" on public.friend_requests;
create policy "fr_insert_sender" on public.friend_requests
  for insert to authenticated
  with check (
    auth.uid() = from_user
    and from_user <> to_user
    and public.can_use_social(auth.uid())
    and not public.is_blocked_with(to_user)
  );

drop policy if exists "nudges_insert_friend" on public.nudges;
create policy "nudges_insert_friend" on public.nudges
  for insert to authenticated
  with check (
    auth.uid() = from_user
    and public.can_use_social(auth.uid())
    and not public.is_blocked_with(to_user)
    and exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = to_user
    )
    and not exists (
      select 1 from public.profiles p
      where p.id = to_user and p.block_nudges = true
    )
  );

-- can_see_event respects blocks
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
      and not public.is_blocked_with(e.user_id)
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

-- Search excludes blocked users
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
    select p.id, p.username
    from public.profiles p
    where p.id <> uid
      and not public.is_blocked_with(p.id)
      and p.username::text ilike '%' || q || '%'
    order by p.username
    limit lim;
end;
$$;
