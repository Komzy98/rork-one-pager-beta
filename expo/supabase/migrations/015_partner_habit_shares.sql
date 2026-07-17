-- Habit-scoped accountability: partners only see activity for shared habits.
-- Run AFTER 014_age_consent_rpc.sql. Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- Per-partner habit visibility (owner shares specific habits with one partner)
-- ---------------------------------------------------------------------------
create table if not exists public.partner_habit_shares (
  owner_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null,
  habit_name text,
  created_at timestamptz not null default now(),
  primary key (owner_id, partner_id, habit_id),
  check (owner_id <> partner_id)
);

create index if not exists idx_phs_partner on public.partner_habit_shares (partner_id, owner_id);

alter table public.partner_habit_shares enable row level security;

drop policy if exists "phs_select_party" on public.partner_habit_shares;
create policy "phs_select_party" on public.partner_habit_shares
  for select to authenticated
  using (
    auth.uid() = owner_id
    or auth.uid() = partner_id
  );

drop policy if exists "phs_insert_owner" on public.partner_habit_shares;
create policy "phs_insert_owner" on public.partner_habit_shares
  for insert to authenticated
  with check (
    auth.uid() = owner_id
    and public.can_use_social(auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = partner_id
    )
    and not public.is_blocked_with(partner_id)
  );

drop policy if exists "phs_delete_owner" on public.partner_habit_shares;
create policy "phs_delete_owner" on public.partner_habit_shares
  for delete to authenticated
  using (auth.uid() = owner_id);

-- Friend request payload: habits included in the invite
alter table public.friend_requests
  add column if not exists invite_habit_ids text[] not null default '{}';

alter table public.friend_requests
  add column if not exists invite_habit_names text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.list_my_habit_shares()
returns table (
  owner_id uuid,
  partner_id uuid,
  habit_id text,
  habit_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.owner_id, s.partner_id, s.habit_id, s.habit_name, s.created_at
  from public.partner_habit_shares s
  where s.owner_id = auth.uid() or s.partner_id = auth.uid()
  order by s.created_at desc;
$$;
revoke all on function public.list_my_habit_shares() from public;
grant execute on function public.list_my_habit_shares() to authenticated;

create or replace function public.set_partner_habit_shares(
  p_partner_id uuid,
  p_habit_ids text[],
  p_habit_names text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  hid text;
  hname text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_partner_id is null or p_partner_id = auth.uid() then raise exception 'invalid partner'; end if;
  if not public.can_use_social(auth.uid()) then raise exception 'social not available'; end if;
  if not exists (
    select 1 from public.friendships f
    where f.user_id = auth.uid() and f.friend_id = p_partner_id
  ) then
    raise exception 'not partners';
  end if;
  if public.is_blocked_with(p_partner_id) then raise exception 'blocked'; end if;

  delete from public.partner_habit_shares
    where owner_id = auth.uid() and partner_id = p_partner_id;

  if p_habit_ids is null or array_length(p_habit_ids, 1) is null then
    return;
  end if;

  for i in 1..array_length(p_habit_ids, 1) loop
    hid := nullif(trim(p_habit_ids[i]), '');
    if hid is null then continue; end if;
    hname := null;
    if p_habit_names is not null and array_length(p_habit_names, 1) >= i then
      hname := nullif(trim(p_habit_names[i]), '');
    end if;
    insert into public.partner_habit_shares (owner_id, partner_id, habit_id, habit_name)
      values (auth.uid(), p_partner_id, hid, hname)
      on conflict do nothing;
  end loop;
end;
$$;
revoke all on function public.set_partner_habit_shares(uuid, text[], text[]) from public;
grant execute on function public.set_partner_habit_shares(uuid, text[], text[]) to authenticated;

-- Apply invite habits when a request is accepted
create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests%rowtype;
  i int;
  hid text;
  hname text;
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

  if req.invite_habit_ids is not null and array_length(req.invite_habit_ids, 1) is not null then
    for i in 1..array_length(req.invite_habit_ids, 1) loop
      hid := nullif(trim(req.invite_habit_ids[i]), '');
      if hid is null then continue; end if;
      hname := null;
      if req.invite_habit_names is not null and array_length(req.invite_habit_names, 1) >= i then
        hname := nullif(trim(req.invite_habit_names[i]), '');
      end if;
      insert into public.partner_habit_shares (owner_id, partner_id, habit_id, habit_name)
        values (req.from_user, req.to_user, hid, hname)
        on conflict do nothing;
    end loop;
  end if;
end;
$$;

-- Remove habit shares when unfriending
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
  delete from public.partner_habit_shares
    where (owner_id = auth.uid() and partner_id = other_user)
       or (owner_id = other_user and partner_id = auth.uid());
end;
$$;
