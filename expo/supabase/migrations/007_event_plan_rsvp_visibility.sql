-- Let any signed-in user read event shared_plans so they can join the same plan row
-- (one plan per event_id) after a guest web RSVP or a friend's invite.
-- Run AFTER 005_shared_plans.sql. Safe to re-run (idempotent).

drop policy if exists "sp_select_visible" on public.shared_plans;
create policy "sp_select_visible" on public.shared_plans
  for select to authenticated
  using (
    plan_type = 'event'
    or owner_id = auth.uid()
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
