# Shows Library Redesign

This overhaul replaces the ambiguous save-and-start-watching flow with an explicit personal library.

## Behaviour
- **Add to My List** creates a `Plan to Watch` record on the first tap. It does not start playback. A confirmation offers an optional **Start Watching** shortcut.
- Saved titles open a compact **manage** sheet with Watching, Want to Watch, Watched and Paused. These friendly names map to **existing storage keys**, preserving existing records.
- Movies remain simple; TV series can open an episode tracker with season/episode selection, mark-watched actions and only aired episodes.
- The tracker stores **lastWatchedSeason/lastWatchedEpisode** independently from the existing `currentSeason/currentEpisode` (next/current position); linked-streaming continue rows may advance, but not rewind, manually tracked progress.
- Streaming offers, rental and purchase options have a separate sheet. Region is explicitly selectable and saved per user; default is UK, **not inferred nationality**.
- The library supports Watching / Watchlist / Watched / Paused / All, movie/TV filters, search, sorting, ratings on completed titles, provider-watchlist intersections and opt-in new-episode alerts.
- For You uses genre signals from a bounded, cached sample of actual saved titles, not only saved titles also found in trending lists.
- Save/update/remove publishes immediately to the cached UI; serialized local/cloud persistence prevents older asynchronous writes from overwriting newer taps.

## Integrations and limits
- Streaming deeplinks use the app's existing Younify/TMDB/provider navigation. Some providers can only open a title search or listing, **not guaranteed autoplay**; rental/buy routes open verified JustWatch offers rather than pretending a transaction already grants playback.
- The app uses Younify for connected-provider discovery and TMDB for title metadata.
- No EAS build or TestFlight submission is triggered by this branch.

## Verification
- `cd expo && npx tsc --noEmit`
- `cd expo && npm test` (includes `showsLibraryRedesign.test.ts`)
- `cd expo && npx expo export --platform ios`

Manual QA before store release: save from For You/search/detail, rapid consecutive saves, switch statuses, close/open nested iOS sheets, change provider region, mark a finale and a not-yet-aired next episode, reconnect streaming services, and verify cloud sync after offline use.
