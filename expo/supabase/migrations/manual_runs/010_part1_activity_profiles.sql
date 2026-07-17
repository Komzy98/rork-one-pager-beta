-- Run 1/4 of 010_technical_enforcement (after 002–009). Then part2, part3, part4.
create extension if not exists pgcrypto;

drop policy if exists "ae_insert_own" on public.activity_events;
create policy "ae_insert_own" on public.activity_events
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.activity_visibility <> 'private'
    )
  );

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_friends" on public.profiles;
drop policy if exists "profiles_select_request_party" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_select_friends" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = profiles.id
    )
  );

create policy "profiles_select_request_party" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.friend_requests fr
      where fr.status = 'pending'
        and (
          (fr.from_user = auth.uid() and fr.to_user = profiles.id)
          or (fr.to_user = auth.uid() and fr.from_user = profiles.id)
        )
    )
  );
