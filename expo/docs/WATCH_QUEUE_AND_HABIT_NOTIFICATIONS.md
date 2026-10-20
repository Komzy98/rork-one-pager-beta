# Intelligent watch queues and habit reminders

## Watch queue

- Continue Watching merges the linked-service feed and the local library, deduplicating by media type/TMDB ID and title fallback. Linked-service items with no verified playback progress/episode are omitted; standalone films near completion are not labelled Resume. Manual Watching titles without evidence open Details instead of claiming playback.
- What to Watch Next is a ranked, explainable watchlist. Verified TMDB regional watch providers intersect with connected Younify services; a match informs the availability message but does **not** guarantee subscription access or exact app autoplay. TMDB title genres, release dates and runtimes plus your currently watching genres and near-term calendar events help rank suggestions. Missing availability remains unconfirmed. Tapping a recommendation opens Details rather than starting playback or changing watch status.
- The connected provider region follows the country explicitly selected in Shows, defaulting to UK; different-country offers are not substituted.

## Habit notification engine

- Supports Task habit settings **Smart**, **My time** (24h HH:mm), and **Off** within Task Edit > Habit Engine. A user-chosen time overrides inference. Smart uses a preferred habit window, then at least four completion timestamps (otherwise a habit-type heuristic). Both Task and legacy habit data feed the scheduler; task versions are preferred when names match.
- Schedules one-shot local device notifications for up to seven days, never more than six per day or 35 outstanding. Completion-aware reconciliation occurs when the app is active, tasks/habits/preferences change, notification permission changes, or the app reopens. It does not replace user-specific schedules with hard-coded 09:00/18:00 notifications. Already completed/paused/disabled items are excluded. Explicit quiet hours are honoured. For times-per-week habits, reminders stop once the week's target is reached.
- Optional **one** follow-up, only if within the habit's window and allowed by quiet hours. Quick iOS actions: **Mark Done**, **In 20 minutes**, **No more today**. Mark Done writes an idempotent completion into the existing Task or legacy habit records, including after cold-start hydration. Mute and snooze persist per account/day. Action taps navigate to Tasks if users want to finish inside the app.
- Settings lists upcoming scheduled reminders and a locally stored event history of schedule, cancel, app-observed receive, opened and quick actions. An app-observed receive is not evidence that Apple delivered a background notification.

## Important delivery limitations

Local notifications use iOS's native scheduling and work while the app is closed once registered. iOS does not wake an ordinary app to re-check Apple Health, task/cloud sync, or habit completion immediately before each alert. If progress changes outside One Pager while it is closed, a pre-scheduled alert might still fire until the app resumes and reconciles. Smart scheduling is refreshed within a seven-day window, so users should open the app periodically. Cross-device server-driven push reconciliation would require a separate authenticated backend worker, token registration and push-provider validation. It is **not** claimed as delivered here.

## Validation and release

- Run `cd expo && npm test` and `./node_modules/.bin/tsc --noEmit`.
- Export a fresh iOS JS bundle with `CI=1 npx expo export --platform ios --clear` and confirm updated feature strings appear in its source bundle.
- Before TestFlight: verify notification permission prompt, exact-time reminders, a 20-minute snooze, same-day mute, Mark Done cold-start persistence, cancellation on both old and Task habit completions, quiet hours over midnight, user switching, time-zone changes, weekend frequencies, linked-provider deeplinks and watch queue fallback where TMDB data is unavailable.
- No EAS or TestFlight build is started by this change.
