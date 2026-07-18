-- Bidirectional friendship repair + private-by-default activity visibility for new profiles.
-- Run AFTER 018_partner_search_avatars.sql. Safe to re-run (idempotent).

-- Fix one-way friendship rows: if only (B, A) exists, user A couldn't see B in their partner list.
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
  where (f.user_id = auth.uid() or f.friend_id = auth.uid())
    and not exists (
      select 1 from public.friendships r
      where r.user_id = f.friend_id and r.friend_id = f.user_id
    )
  on conflict do nothing;
end;
$$;
revoke all on function public.repair_friendship_links() from public;
grant execute on function public.repair_friendship_links() to authenticated;

-- New social profiles start private — partners see name, avatar, and streak until user opts in.
alter table public.profiles
  alter column activity_visibility set default 'private';
