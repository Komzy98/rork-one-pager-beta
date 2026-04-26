-- One Pager cloud sync table
-- Run this in Supabase SQL editor (or via migration tool) before enabling sync.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_data_updated_at
  on public.user_data (updated_at desc);

alter table public.user_data enable row level security;

-- Users can only read/write their own row.
drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own"
  on public.user_data
  for select
  using (auth.uid()::text = user_id::text);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own"
  on public.user_data
  for insert
  with check (auth.uid()::text = user_id::text);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own"
  on public.user_data
  for update
  using (auth.uid()::text = user_id::text)
  with check (auth.uid()::text = user_id::text);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own"
  on public.user_data
  for delete
  using (auth.uid()::text = user_id::text);
