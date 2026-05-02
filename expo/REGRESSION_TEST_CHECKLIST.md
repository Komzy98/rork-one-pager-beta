# Calendar Account Isolation Regression Checklist

## Release QA Docs
- `REGRESSION_TEST_CHECKLIST.md` (this file): focused regression paths for account-isolation bugs.
- `PRIVACY_AUDIT_CHECKLIST.md`: full release privacy audit across storage namespaces and session transitions.

## Goal
Ensure calendar data does not leak across users on the same device/session.

## Manual Regression (Primary)
- [ ] **Clean start**: reinstall app or clear local app storage.
- [ ] **User A login**: sign in as User A.
- [ ] **User A import**: import 1 calendar file or URL and confirm events appear.
- [ ] **User A logout**: fully sign out from Profile.
- [ ] **User B login**: sign in as a different account (User B) on the same device.
- [ ] **Isolation check**: verify User B sees **zero imported calendars** by default.
- [ ] **Isolation check**: verify User B sees **no selected EventKit calendars** by default.
- [ ] **User B import**: import a calendar for User B and confirm only B's import appears.
- [ ] **Back-switch check**: log out User B, sign in User A, confirm A's own calendars remain intact.

## Negative/Edge Checks
- [ ] **First-time B**: verify behavior when User B has never opened calendar screens before.
- [ ] **Guest boundary**: guest -> User A -> logout -> User B does not inherit guest imports.
- [ ] **Cold restart**: force-close and reopen app after each account switch; isolation still holds.

## Optional Unit-Level Checks (if test harness is added)
- [ ] **`useCalendar` load reset**: when `AsyncStorage.getItem(imported_calendars_<userB>)` returns null, hook sets `calendars` to `[]`.
- [ ] **`useEventKit` load reset**: when `AsyncStorage.getItem(selected_eventkit_calendars_<userB>)` returns null, hook sets `selectedCalendarIds` to `[]`.
- [ ] **Logout cleanup**: `logout()` removes scoped keys:
  - `imported_calendars_<userId>`
  - `selected_eventkit_calendars_<userId>`
  - `eventkit_permissions_granted_<userId>`
