-- One Pager — Community / user-generated habits (Discover UGC) + real save/like counts
-- Run in the Supabase SQL editor AFTER 002_social.sql. Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- community_habits: habits/routines published by users.
-- ---------------------------------------------------------------------------
create table if not exists public.community_habits (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  creator_name text,
  creator_username text,
  creator_avatar text,
  name text not null,
  description text,
  long_description text,
  icon text,
  color text not null default '#6366F1',
  category text not null default 'Other',
  difficulty text check (difficulty in ('Easy', 'Medium', 'Hard')),
  estimated_duration text,
  tags text[] not null default '{}',
  frequency jsonb not null default '{"days": [], "type": "daily"}'::jsonb,
  benefits text[] not null default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_habits_public on public.community_habits (is_public, created_at desc);
create index if not exists idx_community_habits_creator on public.community_habits (creator_id);

alter table public.community_habits enable row level security;

drop policy if exists "ch_select_public" on public.community_habits;
create policy "ch_select_public" on public.community_habits
  for select to authenticated using (is_public or creator_id = auth.uid());

drop policy if exists "ch_insert_own" on public.community_habits;
create policy "ch_insert_own" on public.community_habits
  for insert to authenticated with check (creator_id = auth.uid());

drop policy if exists "ch_update_own" on public.community_habits;
create policy "ch_update_own" on public.community_habits
  for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());

drop policy if exists "ch_delete_own" on public.community_habits;
create policy "ch_delete_own" on public.community_habits
  for delete to authenticated using (creator_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Public aggregate counts. habit_id is a free-form text key so this works for
-- BOTH user-published habits (uuid) and the built-in catalog (string ids).
-- Everyone can read the totals; nobody writes directly (only via RPC).
-- ---------------------------------------------------------------------------
create table if not exists public.community_habit_stats (
  habit_id text primary key,
  saves int not null default 0,
  likes int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.community_habit_stats enable row level security;

drop policy if exists "chs_select_all" on public.community_habit_stats;
create policy "chs_select_all" on public.community_habit_stats
  for select to authenticated using (true);
-- No insert/update/delete policies: writes go through SECURITY DEFINER RPCs only.

-- ---------------------------------------------------------------------------
-- Per-user save / like ledgers (private: you only see your own rows).
-- ---------------------------------------------------------------------------
create table if not exists public.community_saves (
  habit_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (habit_id, user_id)
);
alter table public.community_saves enable row level security;

drop policy if exists "cs_select_own" on public.community_saves;
create policy "cs_select_own" on public.community_saves
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.community_likes (
  habit_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (habit_id, user_id)
);
alter table public.community_likes enable row level security;

drop policy if exists "cl_select_own" on public.community_likes;
create policy "cl_select_own" on public.community_likes
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPCs: toggle save / like and keep the public counter consistent + idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.toggle_community_save(p_habit_id text, p_saved boolean)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
  total int;
begin
  if p_habit_id is null or length(p_habit_id) = 0 then
    raise exception 'habit_id required';
  end if;

  if p_saved then
    insert into public.community_saves (habit_id, user_id)
      values (p_habit_id, auth.uid())
      on conflict (habit_id, user_id) do nothing;
    get diagnostics affected = row_count;
    if affected > 0 then
      insert into public.community_habit_stats (habit_id, saves)
        values (p_habit_id, 1)
        on conflict (habit_id) do update
          set saves = public.community_habit_stats.saves + 1, updated_at = now();
    end if;
  else
    delete from public.community_saves
      where habit_id = p_habit_id and user_id = auth.uid();
    get diagnostics affected = row_count;
    if affected > 0 then
      update public.community_habit_stats
        set saves = greatest(saves - 1, 0), updated_at = now()
        where habit_id = p_habit_id;
    end if;
  end if;

  select saves into total from public.community_habit_stats where habit_id = p_habit_id;
  return coalesce(total, 0);
end;
$$;
revoke all on function public.toggle_community_save(text, boolean) from public;
grant execute on function public.toggle_community_save(text, boolean) to authenticated;

create or replace function public.toggle_community_like(p_habit_id text, p_liked boolean)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
  total int;
begin
  if p_habit_id is null or length(p_habit_id) = 0 then
    raise exception 'habit_id required';
  end if;

  if p_liked then
    insert into public.community_likes (habit_id, user_id)
      values (p_habit_id, auth.uid())
      on conflict (habit_id, user_id) do nothing;
    get diagnostics affected = row_count;
    if affected > 0 then
      insert into public.community_habit_stats (habit_id, likes)
        values (p_habit_id, 1)
        on conflict (habit_id) do update
          set likes = public.community_habit_stats.likes + 1, updated_at = now();
    end if;
  else
    delete from public.community_likes
      where habit_id = p_habit_id and user_id = auth.uid();
    get diagnostics affected = row_count;
    if affected > 0 then
      update public.community_habit_stats
        set likes = greatest(likes - 1, 0), updated_at = now()
        where habit_id = p_habit_id;
    end if;
  end if;

  select likes into total from public.community_habit_stats where habit_id = p_habit_id;
  return coalesce(total, 0);
end;
$$;
revoke all on function public.toggle_community_like(text, boolean) from public;
grant execute on function public.toggle_community_like(text, boolean) to authenticated;

-- When a user deletes their published habit, clean up its public stats too.
create or replace function public.handle_community_habit_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.community_habit_stats where habit_id = old.id::text;
  delete from public.community_saves where habit_id = old.id::text;
  delete from public.community_likes where habit_id = old.id::text;
  return old;
end;
$$;

drop trigger if exists trg_community_habit_deleted on public.community_habits;
create trigger trg_community_habit_deleted
  after delete on public.community_habits
  for each row execute function public.handle_community_habit_deleted();

-- ---------------------------------------------------------------------------
-- Realtime: live counts + new publications.
-- ---------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.community_habits; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.community_habit_stats; exception when duplicate_object then null; end;
end $$;
