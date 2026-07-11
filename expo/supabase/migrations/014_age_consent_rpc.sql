-- Reliable age/consent sync (avoids PostgREST schema-cache issues on profiles columns).
-- Run AFTER 011_compliance.sql. Safe to re-run (idempotent).

create or replace function public.sync_age_consent(
  p_birth_year int default null,
  p_parental_social_consent boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.profiles
  set
    birth_year = coalesce(p_birth_year, birth_year),
    parental_social_consent = coalesce(p_parental_social_consent, parental_social_consent),
    updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'profile not found — open Accountability Partners once to create your profile row';
  end if;
end;
$$;

revoke all on function public.sync_age_consent(int, boolean) from public;
grant execute on function public.sync_age_consent(int, boolean) to authenticated;
