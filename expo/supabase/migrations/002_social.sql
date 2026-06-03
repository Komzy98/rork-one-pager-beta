-- One Pager — Accountability Partners (friends) + nudges
-- Run this in the Supabase SQL editor AFTER 001_user_data.sql.
-- Safe to re-run (idempotent).

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- profiles: the small public-ish row each user publishes so friends can
-- discover them by username and see their streak.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  display_name text,
  avatar_url text,
  current_streak int not null default 0,
  total_completions int not null default 0,
  level int not null default 1,
  last_active_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles (username);

alter table public.profiles enable row level security;

-- Any authenticated user can read profiles (needed to add by username + see streaks).
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- friend_requests
-- ---------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user, to_user)
);
create index if not exists idx_fr_to_user on public.friend_requests (to_user, status);
create index if not exists idx_fr_from_user on public.friend_requests (from_user, status);

alter table public.friend_requests enable row level security;

drop policy if exists "fr_select_party" on public.friend_requests;
create policy "fr_select_party" on public.friend_requests
  for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

drop policy if exists "fr_insert_sender" on public.friend_requests;
create policy "fr_insert_sender" on public.friend_requests
  for insert to authenticated
  with check (auth.uid() = from_user and from_user <> to_user);

-- Sender may cancel their own request by deleting it.
drop policy if exists "fr_delete_sender" on public.friend_requests;
create policy "fr_delete_sender" on public.friend_requests
  for delete to authenticated using (auth.uid() = from_user);

-- ---------------------------------------------------------------------------
-- friendships (symmetric: one row per direction)
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);
-- Inserts only happen through accept_friend_request() (security definer).

-- ---------------------------------------------------------------------------
-- nudges ("poke" a friend to keep their streak alive)
-- ---------------------------------------------------------------------------
create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  message text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);
create index if not exists idx_nudges_to_user on public.nudges (to_user, read);

alter table public.nudges enable row level security;

drop policy if exists "nudges_select_party" on public.nudges;
create policy "nudges_select_party" on public.nudges
  for select to authenticated
  using (auth.uid() = to_user or auth.uid() = from_user);

-- Can only nudge someone you are already friends with.
drop policy if exists "nudges_insert_friend" on public.nudges;
create policy "nudges_insert_friend" on public.nudges
  for insert to authenticated
  with check (
    auth.uid() = from_user
    and exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = to_user
    )
  );

drop policy if exists "nudges_update_recipient" on public.nudges;
create policy "nudges_update_recipient" on public.nudges
  for update to authenticated
  using (auth.uid() = to_user) with check (auth.uid() = to_user);

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests%rowtype;
begin
  select * into req from public.friend_requests where id = request_id;
  if not found then raise exception 'request not found'; end if;
  if req.to_user <> auth.uid() then raise exception 'not authorized'; end if;
  if req.status <> 'pending' then raise exception 'request not pending'; end if;

  update public.friend_requests
    set status = 'accepted', responded_at = now()
    where id = request_id;

  insert into public.friendships (user_id, friend_id)
    values (req.to_user, req.from_user) on conflict do nothing;
  insert into public.friendships (user_id, friend_id)
    values (req.from_user, req.to_user) on conflict do nothing;
end;
$$;
revoke all on function public.accept_friend_request(uuid) from public;
grant execute on function public.accept_friend_request(uuid) to authenticated;

create or replace function public.reject_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests%rowtype;
begin
  select * into req from public.friend_requests where id = request_id;
  if not found then raise exception 'request not found'; end if;
  if req.to_user <> auth.uid() then raise exception 'not authorized'; end if;
  update public.friend_requests
    set status = 'rejected', responded_at = now()
    where id = request_id;
end;
$$;
revoke all on function public.reject_friend_request(uuid) from public;
grant execute on function public.reject_friend_request(uuid) to authenticated;

create or replace function public.remove_friend(other_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
    where (user_id = auth.uid() and friend_id = other_user)
       or (user_id = other_user and friend_id = auth.uid());
  delete from public.friend_requests
    where (from_user = auth.uid() and to_user = other_user)
       or (from_user = other_user and to_user = auth.uid());
end;
$$;
revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: add tables to the supabase_realtime publication (idempotent).
-- ---------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.friend_requests; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.nudges; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
end $$;
