# Privacy Audit Checklist

Use this checklist before every release to verify account isolation and prevent cross-user data leakage on shared devices.

## Scope

- Local storage key scoping (AsyncStorage/unifiedStorage)
- Auth/session transition cleanup (login/logout/account switch/delete account)
- In-memory cache isolation for singleton services
- Notification metadata and scheduled-job isolation
- Cloud sync state isolation per user

## Key Namespace Inventory

These keys must be user-scoped (`_<userId>` or equivalent guest namespace) unless explicitly documented as device-global.

### Auth + Security

- `@auth_user` (active session cache)
- `biometric_enabled`
- `biometric_credentials`

### Profile + Onboarding + Preferences

- `@user_profile_<userId>` (already scoped)
- `@tab_walkthroughs_seen_<userId>`
- `ui-state_<userId>`
- `@app_theme_settings_<userId>`

### Calendar + EventKit

- `imported_calendars_<userId>`
- `selected_eventkit_calendars_<userId>`
- `eventkit_permissions_granted_<userId>`

### Sports + Activities

- `sports_selected_leagues_<userId>`
- `sports_favorite_leagues_<userId>`
- `sports_notified_matches_<userId>`
- `dismissed_new_episodes_<userId>`

### Shows + Notifications

- `liked_content_<userId>`
- `tracked_shows_notifications_<userId>`
- `scheduled_notifications_<userId>`

### Cloud Sync

- `cloud_sync_enabled_<userId>`
- `cloud_sync_provider_<userId>`
- `cloud_sync_timestamp_<userId>`
- `supabase_sync_user_id` (must be cleared on logout/delete)

## Release Gate Checklist

- [ ] All user-specific keys above are stored and read via user-scoped variants.
- [ ] Legacy unscoped keys (if still supported) are read only for one-time migration.
- [ ] On missing scoped key, state resets to empty/default (no stale in-memory carryover).
- [ ] Auth transitions call cleanup paths (logout and delete account clear scoped keysets).
- [ ] Service singletons bind to active user and do not share cache across users.
- [ ] Notification ledger is per-user and UI reloads ledger on account switch.
- [ ] Cloud sync keys are scoped and sync init flags reset on user changes.
- [ ] No plaintext credentials are persisted beyond intended local-auth flow.

## Script-Style QA Sanity Flow (Run Every Release)

> Use two real test accounts: `UserA` and `UserB`.

### 1) Clean Baseline

1. Install fresh build (or clear app storage).
2. Launch app and ensure unauthenticated state.

Expected:
- No old data appears before login.

### 2) Seed UserA Data

1. Sign in as `UserA`.
2. Import a calendar.
3. Select EventKit calendars (iOS).
4. Like a show/movie.
5. Track a TV show with notifications enabled.
6. Change sports filters/favorites and dismiss one episode card.
7. Change UI filter, walkthrough state, and theme.

Expected:
- All actions persist for `UserA`.

### 3) Switch to UserB

1. Logout `UserA`.
2. Sign in as `UserB` (new or existing account with no seeded local data).

Expected (critical):
- `UserB` sees **none** of `UserA` local artifacts:
  - no imported calendars
  - no selected EventKit calendars
  - no liked content
  - no tracked show notifications
  - no sports filter/favorite/notified-match state
  - no dismissed-episode history
  - no carried-over walkthrough/UI/theme state (unless intentionally device-global)

### 4) Seed UserB + Round-Trip

1. Add different data for `UserB` (calendar + likes + tracked show).
2. Logout `UserB`.
3. Login back as `UserA`.

Expected:
- `UserA` sees only `UserA` data.
- `UserB` data does not appear in `UserA` session.

### 5) Delete Account Safety

1. While logged in as test user, run Delete Account.
2. Login as another user.

Expected:
- Deleted user’s local scoped keys and sync user ID are cleared.
- No leaked data appears in next account.

### 6) Restart + Resume

1. Force close app.
2. Reopen and login each test account once.

Expected:
- Isolation remains correct after cold start.

## Quick Failure Signals (Block Release)

- Any user sees another user’s calendar/events/likes/tracked shows/preferences.
- Account switch shows stale data until manual refresh.
- Notification list contains entries from prior account.
- Cloud sync settings/provider state carries between users.

## Optional Automation Hooks

- Add E2E scenario: `A_seed -> logout -> B_verify_empty -> B_seed -> A_verify_original`.
- Add unit tests for loaders: `null scoped key => reset state`, `legacy key => migrate once`.

---

Related doc: `REGRESSION_TEST_CHECKLIST.md`
