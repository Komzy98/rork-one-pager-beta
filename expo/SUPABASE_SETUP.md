# Supabase Setup

This app already includes Supabase auth + cloud sync wiring.  
To enable it end-to-end, complete the steps below.

## 1) Add environment variables

In `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# Required for secure backend account deletion calls
EXPO_PUBLIC_RORK_API_BASE_URL=https://<your-api-host>
```

Football API deploy paths (Simulator vs TestFlight, Railway health checks, CI smoke): see [docs/FOOTBALL_DEPLOY.md](./docs/FOOTBALL_DEPLOY.md).

Events discovery (Ticketmaster + Skiddle keys, merge behaviour): see [docs/EVENTS_DEPLOY.md](./docs/EVENTS_DEPLOY.md).

Notes:
- Use the **Project API URL**, not the dashboard URL.
- Restart Metro after changing env vars.

For the backend API process (Hono server), also set:

```bash
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Important:
- `SUPABASE_SERVICE_ROLE_KEY` must be set on the backend only (never in client env).
- It is required for true server-side auth-user deletion.

## 2) Create cloud sync table

Run SQL in Supabase SQL editor:

- `supabase/migrations/001_user_data.sql`

This creates `public.user_data` and enables RLS policies so each user can access only their own row.

## 3) Verify auth/session

In app:
- Sign up / sign in.
- Confirm session restore after app relaunch.

## 4) Verify sync

Create/update:
- Habits
- Tasks
- Shows
- User profile

Then confirm `public.user_data` has one row for your user with JSON data payload.

## 5) Simulator behavior

Guest/default users now hydrate from local `*_default` keys, so local persistence works even without a Supabase session.

## 6) Verify secure account deletion

- Start backend API with service role key configured.
- Sign in with a Supabase account.
- From Profile, tap **Delete Account** and confirm.
- Verify:
  - App returns to auth screen.
  - User is removed from Supabase Authentication users list.
