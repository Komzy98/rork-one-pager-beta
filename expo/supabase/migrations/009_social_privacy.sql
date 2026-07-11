-- Granular partner privacy flags on public profiles.
-- Run AFTER 008_avatars_storage.sql. Safe to re-run (idempotent).

alter table public.profiles
  add column if not exists share_streak_only boolean not null default false;

alter table public.profiles
  add column if not exists share_events_only boolean not null default false;

alter table public.profiles
  add column if not exists hide_last_active boolean not null default false;

alter table public.profiles
  add column if not exists block_nudges boolean not null default false;
