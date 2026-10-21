# Phase 1 — Unified Intelligence Context

**Status:** First implementation on `feature/phase1-unified-intelligence`. This is the context foundation, not an LLM launch.

## Shipped in this increment

- A pure, bounded `buildIntelligenceContext()` snapshot for today's habits, tasks, calendar, weather, sports, shows and saved events.
- Explicit per-source `ready`, `empty`, `unavailable` and `stale` status, with recorded observation timestamps when provided.
- Normalised text, duplicate removal, future-only fixture filtering, bounded lists, and a deterministic context signature.
- The existing daily summary consumes the snapshot for its contextual highlights and retains its verified, deterministic achievement and score calculations.
- Weather timestamps recorded at successful fetch and football bundle timestamps supplied by React Query. Old live weather / match information is omitted instead of represented as current.
- The daily-summary cache version is bumped so previous summaries are not mistaken for ones built with the new source metadata.
- A bounded projection `toBriefingModelContext()` is available for a later server-side LLM integration. No new client-side API keys or extra request is added to summary generation.

## Behaviour and safety constraints

The code distinguishes a disconnected calendar from a connected calendar with zero events. It never equates "no data" with "nothing scheduled." Unknown refresh times are **not** presumed recent or stale. When an update timestamp is present, freshness windows are: weather 2h, sports 15m, calendar 30m, events 1h. Non-live habit/task/show data does not use arbitrary TTLs.

No automatic notifications, tab switches, or button actions invoke a model. Source records are kept on-device by this layer and are not sent to an LLM. Recovery Mode continues using its existing path; this increment does not alter it.

The app still generates the normal summary synchronously from verified inputs and caches the result under the existing per-user/day key. The summary now attaches a source-health map, snapshot signature, and timestamp for future invalidation and debugging.

## Remaining Phase 1 work

1. Replace ad-hoc extraction of category data in Overview with shared selectors for other screens, with verified source readiness and refresh timestamps.
2. Add privacy controls for which sources are allowed in future LLM requests.
3. Add an authenticated **server-side**, opt-in language-model enrichment path with strict schema validation, bounded input and token budgets, caching and a deterministic fallback. Do not put secrets in Expo.
4. Validate end-to-end on iOS and use telemetry to measure latency, source completeness, accuracy and cache hits.

## Verification

- `node --import tsx --test utils/__tests__/*.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`

Do not submit to EAS / TestFlight as part of this increment.
