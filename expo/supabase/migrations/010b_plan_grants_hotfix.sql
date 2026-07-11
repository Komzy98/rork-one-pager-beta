-- Hotfix: create plan_access_grants if 010 failed mid-run (policy before table).
-- Safe to re-run. Run this, then re-run the full 010_technical_enforcement.sql.

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

alter table public.shared_plans
  add column if not exists invite_token text unique
    default encode(gen_random_bytes(16), 'hex');

update public.shared_plans
  set invite_token = encode(gen_random_bytes(16), 'hex')
  where invite_token is null;

-- Only enforce NOT NULL when every row has a token (skip if column already NOT NULL).
do $$
begin
  if exists (
    select 1 from public.shared_plans where invite_token is null
  ) then
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
