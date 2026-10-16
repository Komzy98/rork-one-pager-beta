-- RSVP owner-policy repair for environments where 005_shared_plans.sql
-- was only partially deployed. Safe to re-run in Supabase SQL Editor.
-- Does NOT allow anonymous inserts or relax existing read privacy.
-- Apply via an authorised database migration connection.
begin;

alter table public.shared_plans enable row level security;
alter table public.plan_rsvps enable row level security;

drop policy if exists "sp_insert_own" on public.shared_plans;
create policy "sp_insert_own" on public.shared_plans
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "pr_upsert_own" on public.plan_rsvps;
create policy "pr_upsert_own" on public.plan_rsvps
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "pr_update_own" on public.plan_rsvps;
create policy "pr_update_own" on public.plan_rsvps
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
