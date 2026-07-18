-- Fix: "infinite recursion detected in policy for relation profiles"
-- Cause: profiles_select_plan_coparticipant subqueries public.profiles inside a profiles RLS policy.
-- Run AFTER 010_technical_enforcement.sql. Safe to re-run (idempotent).
-- NOTE: Also run 017_plan_rls_recursion_fix.sql for plan_rsvps ↔ shared_plans recursion.

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

-- Full plan + coparticipant fixes are in 017 (run after this file).
