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

## 6) Google sign-in branding (show “One Pager” like Strava)

Supabase browser OAuth always shows `*.supabase.co` on Google’s screen. For **One Pager** branding on iPhone/Android, use the native Google Sign-In SDK (already wired in the app).

### Google Cloud Console

1. **OAuth consent screen**
   - App name: **One Pager**
   - Logo, support email, privacy policy, terms
   - Publishing status: **Production** (or add test users while Testing)

2. **Web client** (already used for Supabase + id-token verification)
   - Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Do **not** add `onepager://auth` here
   - Client id → `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and Supabase Google provider

3. **iOS client** (required for branded native sign-in)
   - Create OAuth client → Application type: **iOS**
   - Bundle ID: `app.rork.OPbeta`
   - Copy client id → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env` and EAS secrets

4. **Supabase → Authentication → Providers → Google**
   - Enable **Skip nonce check** (required for native iOS Google Sign-In — the mobile SDK does not send a matching nonce to Supabase)

5. **Android client** (optional, for branded sign-in on Android)
   - Application type: **Android**, package `app.rork.opbeta`, SHA-1 from your keystore
   - Client id → `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### After adding iOS client id

1. Add to `.env`:
   ```bash
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>.apps.googleusercontent.com
   ```
2. **Rebuild the native app** (Metro reload is not enough):
   ```bash
   npx expo run:ios
   ```
   or `eas build --profile preview --platform ios`

The native flow shows **“One Pager” Wants to Use “accounts.google.com”** and **“to continue to One Pager”** on Google’s account picker — same as Strava.

3. **Supabase** → Authentication → Providers → Google:
   - Same client id + secret from step 2
   - Enable the provider

4. Rebuild the app after env changes (EAS production).

### Optional: Supabase custom auth domain

If you omit `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, sign-in falls back to Supabase-hosted OAuth and will show your project subdomain. To brand that path, add a custom domain in Supabase (e.g. `auth.onepagerapp.co.uk`) and set `EXPO_PUBLIC_SUPABASE_URL` to it.

## 7) Verify secure account deletion

- Start backend API with service role key configured.
- Sign in with a Supabase account.
- From Profile, tap **Delete Account** and confirm.
- Verify:
  - App returns to auth screen.
  - User is removed from Supabase Authentication users list.
