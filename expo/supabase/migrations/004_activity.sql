-- One Pager — Activity feed, cheers (lightweight reactions) + presence.
-- Run in the Supabase SQL editor AFTER 003_community.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Privacy control: how widely a user's activity is shared.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists activity_visibility text not null default 'friends';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_activity_visibility_check'
  ) then
    alter table public.profiles
      add constraint profiles_activity_visibility_check
      check (activity_visibility in ('public', 'friends', 'private'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- activity_events: the feed ("Sarah hit a 30-day streak", etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  cheers_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_user_created on public.activity_events (user_id, created_at desc);
create index if not exists idx_activity_created on public.activity_events (created_at desc);

alter table public.activity_events enable row level security;

-- You can read your own events, and friends' events when their visibility allows it,
-- plus anyone who set their activity to fully public.
drop policy if exists "ae_select_visible" on public.activity_events;
create policy "ae_select_visible" on public.activity_events
  for select to authenticated
  using (
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
  );

drop policy if exists "ae_insert_own" on public.activity_events;
create policy "ae_insert_own" on public.activity_events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ae_delete_own" on public.activity_events;
create policy "ae_delete_own" on public.activity_events
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- activity_reactions: "cheers". Private ledger; counts live on the event.
-- ---------------------------------------------------------------------------
create table if not exists public.activity_reactions (
  event_id uuid not null references public.activity_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.activity_reactions enable row level security;

drop policy if exists "ar_select_own" on public.activity_reactions;
create policy "ar_select_own" on public.activity_reactions
  for select to authenticated using (user_id = auth.uid());
-- Writes go through toggle_cheer() only.

-- ---------------------------------------------------------------------------
-- can_see_event: shared visibility check used by the cheer RPC.
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
        or p.activity_visibility = 'public'
        or (
          p.activity_visibility = 'friends'
          and exists (
            select 1 from public.friendships f
            where f.user_id = auth.uid() and f.friend_id = e.user_id
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
revoke all on function public.can_see_event(uuid) from public;
grant execute on function public.can_see_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.activity_events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.activity_reactions; exception when duplicate_object then null; end;
end $$;
