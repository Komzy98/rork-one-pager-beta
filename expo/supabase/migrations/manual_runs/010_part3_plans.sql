-- Run 3/4 of 010_technical_enforcement.
-- Requires: shared_plans (005), plan_rsvps (005/007). Skip if you never use event plans.

create extension if not exists pgcrypto;

alter table public.shared_plans
  add column if not exists invite_token text unique
    default encode(gen_random_bytes(16), 'hex');

do $$
begin
  if exists (select 1 from public.shared_plans where invite_token is null) then
    update public.shared_plans
      set invite_token = encode(gen_random_bytes(16), 'hex')
      where invite_token is null;
  end if;
  begin
    alter table public.shared_plans alter column invite_token set not null;
  exception when others then
    null;
  end;
end $$;

create table if not exists public.plan_access_grants (
  plan_id uuid not null references public.shared_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create index if not exists idx_plan_access_grants_user on public.plan_access_grants (user_id);

alter table public.plan_access_grants enable row level security;

drop policy if exists "pag_select_own" on public.plan_access_grants;
create policy "pag_select_own" on public.plan_access_grants
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.claim_plan_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  t text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  t := trim(coalesce(p_token, ''));
  if length(t) < 8 then raise exception 'invalid token'; end if;

  select sp.id into v_plan_id
    from public.shared_plans sp
    where sp.invite_token = t
    limit 1;

  if not found then raise exception 'plan not found'; end if;

  insert into public.plan_access_grants (plan_id, user_id)
    values (v_plan_id, auth.uid())
    on conflict do nothing;

  return v_plan_id;
end;
$$;
revoke all on function public.claim_plan_invite(text) from public;
grant execute on function public.claim_plan_invite(text) to authenticated;

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
          or exists (
            select 1 from public.profiles owner_p
            where owner_p.id = sp.owner_id
              and owner_p.activity_visibility <> 'private'
              and (
                owner_p.activity_visibility = 'public'
                or exists (
                  select 1 from public.friendships f
                  where f.user_id = auth.uid() and f.friend_id = sp.owner_id
                )
              )
          )
        )
    )
  );

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
    or exists (
      select 1 from public.profiles p
      where p.id = shared_plans.owner_id
        and p.activity_visibility <> 'private'
        and (
          p.activity_visibility = 'public'
          or exists (
            select 1 from public.friendships f
            where f.user_id = auth.uid() and f.friend_id = shared_plans.owner_id
          )
        )
    )
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
          or exists (
            select 1 from public.profiles p
            where p.id = sp.owner_id
              and p.activity_visibility <> 'private'
              and (
                p.activity_visibility = 'public'
                or exists (
                  select 1 from public.friendships f
                  where f.user_id = auth.uid() and f.friend_id = sp.owner_id
                )
              )
          )
        )
    )
  );
