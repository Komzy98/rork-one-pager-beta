-- Fix plan_rls recursion (plan_rsvps <-> shared_plans cycle under RLS).
-- Run AFTER 016_profiles_rls_recursion_fix.sql. Safe to re-run (idempotent).

create or replace function public.plan_visible_to_auth(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shared_plans sp
    where sp.id = p_plan_id
      and (
        sp.owner_id = auth.uid()
        or exists (
          select 1 from public.plan_rsvps r
          where r.plan_id = sp.id and r.user_id = auth.uid()
        )
        or exists (
          select 1 from public.plan_access_grants g
          where g.plan_id = sp.id and g.user_id = auth.uid()
        )
        or public.profile_visible_to_auth(sp.owner_id)
      )
  );
$$;
revoke all on function public.plan_visible_to_auth(uuid) from public;
grant execute on function public.plan_visible_to_auth(uuid) to authenticated;

create or replace function public.profile_is_plan_coparticipant(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plan_rsvps viewer
    join public.plan_rsvps attendee on attendee.plan_id = viewer.plan_id
    where viewer.user_id = auth.uid()
      and attendee.user_id = p_profile_id
      and public.plan_visible_to_auth(viewer.plan_id)
  );
$$;
revoke all on function public.profile_is_plan_coparticipant(uuid) from public;
grant execute on function public.profile_is_plan_coparticipant(uuid) to authenticated;

drop policy if exists "profiles_select_plan_coparticipant" on public.profiles;
create policy "profiles_select_plan_coparticipant" on public.profiles
  for select to authenticated
  using (public.profile_is_plan_coparticipant(profiles.id));

drop policy if exists "sp_select_visible" on public.shared_plans;
create policy "sp_select_visible" on public.shared_plans
  for select to authenticated
  using (public.plan_visible_to_auth(id));

drop policy if exists "pr_select_visible" on public.plan_rsvps;
create policy "pr_select_visible" on public.plan_rsvps
  for select to authenticated
  using (public.plan_visible_to_auth(plan_id));
