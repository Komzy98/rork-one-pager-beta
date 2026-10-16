# Events / RSVP P0–P2 release notes

## P0 — Trustworthy event details and attendance
- Private, per-user event attendance is stored in `user_event_attendance`.
- Ticket status is separate from the RSVP; "Going" never claims a ticket was purchased.
- The 022 migration makes shared groups unique per owner and event, preserving legacy responses. The production database migration was applied on 2026-10-16.
- Creating a plan and RSVPing remains guarded by Supabase authentication and RLS.
- Ticket links remain provider URLs. If none exists, no false purchase link is shown.
- Event posters use provider artwork when available, with category-specific illustrated fallback instead of unrelated stock photography.
- Provider dates do not default to the current time when missing.

## P1 — Discovery and detail
- Main navigation: For You, Explore (all deduplicated events), My Events.
- Time, weekend, friends and price discovery filters remain in the secondary filter row.
- Cleaner event hero and primary Get tickets CTA; Save, Calendar, Share remain secondary.
- RSVP offers Going / Maybe / Not going and explicit confirmation text.
- Going or Maybe adds an event to My Events and keeps the local planning badge aligned.
- Group invitations are created and tokens resolved before sharing.

## P2 — Practical planning and follow-through
- Night-out estimates are collapsed by default and marked as estimates, not real-time timetables.
- Apple Maps / Google Maps receives user-selected driving, transit or walking destinations to calculate real routes.
- Optional calendar and notification actions are available directly after RSVP.
- Existing My Events post-event attendance check and feedback-rating flow remains available.

## Release QA
1. Log in, open a real event, tap Going; confirm success and appearance under My Events.
2. Close and reopen the event; verify RSVP persists; change Going to Maybe, then Not going.
3. Choose Ticket needed, then Ticket secured; restart and verify it persists independently of RSVP.
4. Invite a friend; confirm the group deep link contains a token and joins the intended group.
5. Have two separate users organise the same event independently; neither should see the other's private attendance.
6. Verify event with provider artwork, and another without artwork; no unrelated generic festival photo.
7. Verify the provider ticket button opens a legitimate ticket link; missing link uses Invite friends instead.
8. Test For You, Explore, My Events and More filters on iPhone.
9. Expand Plan your day and route to Maps; verify calendar and reminder permissions.
10. With an ended saved event, verify existing Did you go? / enjoyment feedback appears.

## Known boundaries
- The in-app night-out timeline is heuristic. Only external Maps calculates real transport routes.
- A "Ticket secured" value is self-reported, not verified with a ticketing provider.
- A TestFlight build and device QA are still required for these client changes.
- Existing `plan_rsvps` rows remain as group data; new individual attendance is private.
