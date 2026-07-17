-- Fix: "infinite recursion detected in policy for relation profiles"
-- Cause: profiles_select_plan_coparticipant subqueries public.profiles inside a profiles RLS policy.
-- Run AFTER 010_technical_enforcement.sql. Safe to re-run (idempotent).

create or replace function public.profile_visible_to_auth(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.activity_visibility <> 'private'
      and (
        p.activity_visibility = 'public'
        or exists (
          select 1 from public.friendships f
          where f.user_id = auth.uid() and f.friend_id = p_profile_id
        )
      )
  );
$$;
revoke all on function public.profile_visible_to_auth(uuid) from public;
grant execute on function public.profile_visible_to_auth(uuid) to authenticated;

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
          or public.profile_visible_to_auth(sp.owner_id)
        )
    )
  );

-- Same pattern on shared_plans / plan_rsvps (avoids heavy nested profile reads under RLS).
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
    or public.profile_visible_to_auth(shared_plans.owner_id)
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
          or public.profile_visible_to_auth(sp.owner_id)
        )
    )
  );
