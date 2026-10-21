# Phase 2A — Daily decision engine

A local, deterministic next-step suggestion on the **existing Overview → Your Daily Briefing** card, visible immediately whether or not the user has generated their day review. It uses the Phase 1A intelligence context and never requires Railway, an OpenAI API key, a network call or a new navigation tab.

## What it does

- Picks **one primary next step** from incomplete urgent/high-priority tasks, imminent *known-time* calendar commitments, other open tasks, scheduled-but-unfinished habits, saved events, sports and Continue Watching.
- Calendar commitments starting within 60 minutes take precedence even over an urgent task. Less imminent calendar events do not automatically displace important work.
- Tasks are preferred over leisure where appropriate; shows and sports are offered as optional interests, not mistaken for obligations.
- Adds at most one *factual, relevant cross-category consideration*: the next calendar event when selecting a task/habit, another high-priority task when selecting a calendar event, or fresh adverse weather as context for a calendar/habit.
- For tasks, habits, sports, events and shows, a concise action opens the existing relevant tab. Calendar tips do not pretend to support deep-linking into an event.
- Takes a current local clock and rejects yesterday's context. Updates when React state changes and once per minute while Overview is focused. No persisted countdowns or old recommendations.
- Uses the existing consent/availability/staleness semantics: unlinked calendar, stale sports/weather and empty sources cannot be treated as verified current data.
- Does not assume that saved event means attendance, and does not infer mood, productivity, sports allegiance or a user's enjoyment of a show.
- Recovery Mode hides this prioritisation entirely. AI enrichment remains optional and independent. All main tabs and the established daily review remain.

## Priority ordering

| Source | Eligibility | Weight |
| --- | --- | --- |
| Calendar | Verified today, exact upcoming start in 0–60 minutes | 115–125 |
| Task | Incomplete urgent | 103 |
| Task | Incomplete high priority | 90 |
| Task | Incomplete medium priority | 69 |
| Calendar | Verified today, exact start in 61–180 minutes | 66 |
| Task | Other open | 59 |
| Habit | Scheduled today, incomplete | 57 |
| Calendar | Verified today, later clock time | 44 |
| Calendar | All-day entry | 41 |
| Saved event | Saved for today (not RSVP confirmation) | 37 |
| Sports | Today's match or live (source must be fresh) | 32–35 |
| Saved event | Future | 27 |
| Show | Continue Watching | 18 |

Stable tie-break by candidate identifier. Duplicated priority/task records are deduplicated by source and title. Not-yet-completed scheduled habits are eligible; already completed habits and tasks are not.

## Validation

Run:
```sh
cd expo
node --import tsx --test utils/__tests__/dailyDecisionEngine.test.ts
node --import tsx --test utils/__tests__/*.test.ts
npx tsc --noEmit --pretty false
```

13 focused tests cover: calendar urgency, task-vs-leisure, cross-category consideration, past appointments, done/non-due items, no-data fallback, saved-vs-booked wording, permission and staleness, grounded weather, yesterday cutoff, strict time parsing, determinism and all-day entries.

**Manual iOS acceptance:** Open Overview without generating a summary; add a high-priority task, complete it, add a scheduled habit and toggle it done; set a calendar item 30 minutes ahead, then move it to the past; view with calendar permission disabled; check sports/weather after freshness expiry; verify recovery mode has no decision, and accessible tap targets navigate to the correct tabs. Verify screen reader labels and small-screen Dynamic Type.

**Release policy:** PR only. No Railway deploy, EAS build, TestFlight submission, or production flag changes. The existing PR CI workflow provides a clean-install regression/typecheck/iOS JavaScript export, which is not a simulator or device runtime check.
