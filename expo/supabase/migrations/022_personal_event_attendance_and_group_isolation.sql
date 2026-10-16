-- P0: Personal event attendance is not a public group plan.
-- Existing group invitations remain supported; separate organisers can plan
-- the same event without colliding with each other.
create table if not exists public.user_event_attendance (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  status text not null check (status in ('in', 'maybe', 'cant')),
  ticket_status text not null default 'unknown'
    check (ticket_status in ('unknown', 'need', 'secured', 'not_needed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index if not exists idx_user_event_attendance_status
  on public.user_event_attendance (user_id, status, updated_at desc);
alter table public.user_event_attendance enable row level security;

drop policy if exists "uea_select_own" on public.user_event_attendance;
create policy "uea_select_own" on public.user_event_attendance
  for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "uea_insert_own" on public.user_event_attendance;
create policy "uea_insert_own" on public.user_event_attendance
  for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "uea_update_own" on public.user_event_attendance;
create policy "uea_update_own" on public.user_event_attendance
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "uea_delete_own" on public.user_event_attendance;
create policy "uea_delete_own" on public.user_event_attendance
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- The original index prevented two friends' groups from planning the same
-- real-world event. Keep group uniqueness scoped to the organising owner.
drop index if exists public.idx_shared_plans_event_entity;
create unique index if not exists idx_shared_plans_owner_event_entity
  on public.shared_plans (owner_id, plan_type, entity_id)
  where plan_type = 'event';

-- Preserve RSVPs that predate the private attendance model.
-- If someone RSVP'd in several groups, retain the latest response.
insert into public.user_event_attendance(user_id,event_id,status,updated_at)
select distinct on (r.user_id,p.entity_id)
  r.user_id,p.entity_id,r.status,r.updated_at
from public.plan_rsvps r
join public.shared_plans p on p.id=r.plan_id
where p.plan_type='event'
order by r.user_id,p.entity_id,r.updated_at desc
on conflict (user_id,event_id) do nothing;
