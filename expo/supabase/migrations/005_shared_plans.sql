-- One Pager — Shared plans, RSVPs, and friend-visible event saves.
-- Run AFTER 004_activity.sql. Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- Shared plans (event nights, watch parties, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.shared_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('event', 'match', 'show')),
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  meet_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_shared_plans_event_entity
  on public.shared_plans (plan_type, entity_id)
  where plan_type = 'event';

create index if not exists idx_shared_plans_owner on public.shared_plans (owner_id);

alter table public.shared_plans enable row level security;

-- ---------------------------------------------------------------------------
-- Plan RSVPs
-- ---------------------------------------------------------------------------
create table if not exists public.plan_rsvps (
  plan_id uuid not null references public.shared_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('in', 'maybe', 'cant')),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create index if not exists idx_plan_rsvps_plan on public.plan_rsvps (plan_id);

alter table public.plan_rsvps enable row level security;

-- ---------------------------------------------------------------------------
-- Friend-visible saved events (for Who's going + Friends' picks)
-- ---------------------------------------------------------------------------
create table if not exists public.user_event_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists idx_user_event_saves_event on public.user_event_saves (event_id);

alter table public.user_event_saves enable row level security;

-- ---------------------------------------------------------------------------
-- RLS policies (after all tables exist)
-- ---------------------------------------------------------------------------
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
      select 1 from public.profiles p
      where p.id = shared_plans.owner_id
        and (
          p.activity_visibility = 'public'
          or (
            p.activity_visibility = 'friends'
            and exists (
              select 1 from public.friendships f
              where f.user_id = auth.uid() and f.friend_id = shared_plans.owner_id
            )
          )
        )
    )
  );

drop policy if exists "sp_insert_own" on public.shared_plans;
create policy "sp_insert_own" on public.shared_plans
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "sp_update_own" on public.shared_plans;
create policy "sp_update_own" on public.shared_plans
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

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
            select 1 from public.profiles p
            where p.id = sp.owner_id
              and (
                p.activity_visibility = 'public'
                or (
                  p.activity_visibility = 'friends'
                  and exists (
                    select 1 from public.friendships f
                    where f.user_id = auth.uid() and f.friend_id = sp.owner_id
                  )
                )
              )
          )
        )
    )
  );

drop policy if exists "pr_upsert_own" on public.plan_rsvps;
create policy "pr_upsert_own" on public.plan_rsvps
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "pr_update_own" on public.plan_rsvps;
create policy "pr_update_own" on public.plan_rsvps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pr_delete_own" on public.plan_rsvps;
create policy "pr_delete_own" on public.plan_rsvps
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "ues_select_visible" on public.user_event_saves;
create policy "ues_select_visible" on public.user_event_saves
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = user_event_saves.user_id
        and (
          p.activity_visibility = 'public'
          or (
            p.activity_visibility = 'friends'
            and exists (
              select 1 from public.friendships f
              where f.user_id = auth.uid() and f.friend_id = user_event_saves.user_id
            )
          )
        )
    )
  );

drop policy if exists "ues_upsert_own" on public.user_event_saves;
create policy "ues_upsert_own" on public.user_event_saves
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ues_update_own" on public.user_event_saves;
create policy "ues_update_own" on public.user_event_saves
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ues_delete_own" on public.user_event_saves;
create policy "ues_delete_own" on public.user_event_saves
  for delete to authenticated using (user_id = auth.uid());
