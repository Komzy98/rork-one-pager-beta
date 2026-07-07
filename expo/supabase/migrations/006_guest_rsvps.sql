-- Guest RSVPs for web invite links (friends without the app).
-- Run AFTER 005_shared_plans.sql. Safe to re-run (idempotent).

create table if not exists public.guest_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  plan_id uuid references public.shared_plans(id) on delete set null,
  guest_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  status text not null check (status in ('in', 'maybe', 'cant')),
  invited_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guest_rsvps_event on public.guest_rsvps (event_id);
create index if not exists idx_guest_rsvps_plan on public.guest_rsvps (plan_id);

alter table public.guest_rsvps enable row level security;

drop policy if exists "guest_rsvp_select_auth" on public.guest_rsvps;
create policy "guest_rsvp_select_auth" on public.guest_rsvps
  for select to authenticated
  using (true);
