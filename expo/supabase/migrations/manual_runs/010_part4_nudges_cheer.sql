-- Run 4/4 of 010_technical_enforcement. Requires 009 (block_nudges) and 004 (activity_reactions).

drop policy if exists "nudges_insert_friend" on public.nudges;
create policy "nudges_insert_friend" on public.nudges
  for insert to authenticated
  with check (
    auth.uid() = from_user
    and exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = to_user
    )
    and not exists (
      select 1 from public.profiles p
      where p.id = to_user and p.block_nudges = true
    )
  );

create or replace function public.can_see_event(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.activity_events e
    join public.profiles p on p.id = e.user_id
    where e.id = p_event_id
      and (
        e.user_id = auth.uid()
        or (
          p.activity_visibility = 'public'
          or (
            p.activity_visibility = 'friends'
            and exists (
              select 1 from public.friendships f
              where f.user_id = auth.uid() and f.friend_id = e.user_id
            )
          )
        )
      )
  );
$$;

create or replace function public.toggle_cheer(p_event_id uuid, p_on boolean)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
  total int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_see_event(p_event_id) then
    raise exception 'not authorized';
  end if;

  if p_on then
    insert into public.activity_reactions (event_id, user_id)
      values (p_event_id, auth.uid())
      on conflict (event_id, user_id) do nothing;
    get diagnostics affected = row_count;
    if affected > 0 then
      update public.activity_events
        set cheers_count = cheers_count + 1
        where id = p_event_id;
    end if;
  else
    delete from public.activity_reactions
      where event_id = p_event_id and user_id = auth.uid();
    get diagnostics affected = row_count;
    if affected > 0 then
      update public.activity_events
        set cheers_count = greatest(cheers_count - 1, 0)
        where id = p_event_id;
    end if;
  end if;

  select cheers_count into total from public.activity_events where id = p_event_id;
  return coalesce(total, 0);
end;
$$;
revoke all on function public.toggle_cheer(uuid, boolean) from public;
grant execute on function public.toggle_cheer(uuid, boolean) to authenticated;
