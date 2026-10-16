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

## Completion pass — 16 October 2026

### P0: listing accuracy and ticket confidence
- Provider detail now refreshes Ticketmaster/Skiddle events when opened, instead of prioritising older saved snapshots.
- Cancelled/removed or unreachable provider detail has a visible refresh warning when a saved snapshot is shown.
- Ticketmaster listings without a real local start time no longer fabricate 19:00.
- Skiddle unknown prices no longer masquerade as free; Ticketmaster ranges use the lowest published amount.
- Booking links reject unsafe HTTP, loopback, internal destinations and non-web schemes.
- Eventbrite/Skiddle/Ticketmaster artwork no longer defaults to an unrelated stock festival photograph; load errors and undersized images use branded category treatment.
- Explicit provider end timestamps are carried through to calendar events; missing end times are marked estimated in calendar notes.

### P1: complete attendance confirmation
- Going opens a polished confirmation sheet with an accurate ticket disclaimer, calendar, reminder and group invitation actions.
- The sheet does not reopen unnecessarily if the user has already selected Going.
- Group share links obtain a real plan token before opening the invitation sheet.
- Event reminders are cancelled when the user selects Not going.

### P2: opted-in, personalised journeys and groups
- An event detail has a collapsed journey planner, not a fictitious automatic itinerary.
- The user can select their GPS location **on demand**, or tap a map to choose a separate starting point.
- Walking/driving route durations and distances are calculated using OpenStreetMap OSRM routing services through the Railway API, cached for ten minutes with conservative rate limits.
- Calculations are estimates, **not live traffic**; transit uses the external Maps app for real timetables.
- The journey calculation is a POST request so the selected location is not placed into One Pager API request URLs.
- The selected starting point is not saved into the user's One Pager profile or Supabase; routing providers receive the two coordinates for the request.
- An arrival buffer (15, 20, 30 or 45 minutes) computes an estimated departure time, with a one-time optional departure reminder.
- Changing route inputs clears stale departure alerts; selecting Not going clears both event and departure alerts.
- The group organiser can propose or remove a meeting time. Friend groups remain isolated with owner-scoped policies.
- My Events and combined-events views no longer display fabricated departure itineraries; instead they direct the user to configure their real trip.
- The prior post-event feedback and experience-rating workflow is retained.

### Tested
- Unit and regression tests, type checking, and local iOS Metro/Hermes JavaScript export.
- Backend route response through the local Hono API for both walking and driving; an unsupported transit request was rejected.
- The production Supabase attendance migration from the previous implementation remains live.

### Release boundaries
- The community route endpoint is suitable for low-volume beta exploration but has no service-level guarantee. For significant traffic, replace it with a contracted routing service.
- Public transport departure calculations inside One Pager would require a transit/timetable feed; One Pager correctly opens the native Maps app instead.
- Provider event availability and image quality must still be confirmed against real mobile listings.
- Hands-on iPhone QA and TestFlight release are not performed until explicitly requested.
