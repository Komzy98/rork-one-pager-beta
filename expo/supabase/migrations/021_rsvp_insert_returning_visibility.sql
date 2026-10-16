-- Keep source control aligned with the production Supabase migration.
-- An authenticated owner must see a just-created plan/RSVP row during
-- INSERT ... RETURNING while retaining all existing visibility checks.
-- This migration does NOT modify the owner-only write policies.
drop policy if exists "sp_select_visible" on public.shared_plans;
create policy "sp_select_visible" on public.shared_plans
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.plan_visible_to_auth(id)
  );

drop policy if exists "pr_select_visible" on public.plan_rsvps;
create policy "pr_select_visible" on public.plan_rsvps
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.plan_visible_to_auth(plan_id)
  );
