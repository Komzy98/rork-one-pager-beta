-- Fix partner list showing 0 while friendships exist (RLS profile reads dropping rows).
-- Run AFTER 012_operational.sql. Safe to re-run (idempotent).

-- Repair missing reverse friendship rows for the signed-in user.
create or replace function public.repair_friendship_links()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.friendships (user_id, friend_id)
  select f.friend_id, f.user_id
  from public.friendships f
  where f.user_id = auth.uid()
    and not exists (
      select 1 from public.friendships r
      where r.user_id = f.friend_id and r.friend_id = f.user_id
    )
  on conflict do nothing;
end;
$$;
revoke all on function public.repair_friendship_links() from public;
grant execute on function public.repair_friendship_links() to authenticated;

-- Full partner rows for the signed-in user's friend list (bypasses profile RLS edge cases).
create or replace function public.list_my_friend_profiles()
returns setof public.profiles
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform public.repair_friendship_links();
  return query
    select p.*
    from public.friendships f
    join public.profiles p on p.id = f.friend_id
    where f.user_id = auth.uid()
      and not public.is_blocked_with(p.id)
    order by p.username;
end;
$$;
revoke all on function public.list_my_friend_profiles() from public;
grant execute on function public.list_my_friend_profiles() to authenticated;

-- Batch profile fetch for friends, pending request parties, or self.
create or replace function public.get_partner_profiles(p_user_ids uuid[])
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, array[]::uuid[]))
    and not public.is_blocked_with(p.id)
    and (
      p.id = auth.uid()
      or exists (
        select 1 from public.friendships f
        where f.user_id = auth.uid() and f.friend_id = p.id
      )
      or exists (
        select 1 from public.friend_requests fr
        where fr.status = 'pending'
          and (
            (fr.from_user = auth.uid() and fr.to_user = p.id)
            or (fr.to_user = auth.uid() and fr.from_user = p.id)
          )
      )
    );
$$;
revoke all on function public.get_partner_profiles(uuid[]) from public;
grant execute on function public.get_partner_profiles(uuid[]) to authenticated;
