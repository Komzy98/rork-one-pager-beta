# Events API (Ticketmaster + Skiddle)

The Events tab merges live listings from **Ticketmaster Discovery v2** and **Skiddle Events API** on the backend (`events.getNearby` tRPC route).

## Environment variables

Add to `expo/.env` for local Metro + local API server:

```bash
TICKETMASTER_API_KEY=<your-ticketmaster-key>
SKIDDLE_API_KEY=<your-skiddle-key>
```

For Railway / production API, set the same keys on the backend service (never commit keys to git).

Skiddle keys are free — apply at [skiddle.com/api/join.php](https://www.skiddle.com/api/join.php).

Notes:
- At least **one** key must be set; both providers run in parallel when configured.
- Skiddle is strongest for UK nightlife, gigs, comedy, and festivals.
- Ticketmaster covers broader international listings.
- Restart Metro after changing env vars.

## How merging works

1. Both providers are queried in parallel (same lat/lng, radius, category).
2. Results are normalised to `LocalEvent` (`tm-*` and `sk-*` ids).
3. Near-duplicates (same title, venue, date) are deduped.
4. Response `source` is `ticketmaster`, `skiddle`, `mixed`, or `none`.

## Category mapping (Skiddle)

| App category | Skiddle event codes |
|---|---|
| music | LIVE, CLUB, FEST |
| sports | SPORT |
| comedy | COMEDY |
| theatre | THEATRE |
| arts | ARTS, EXHIB |
| food | BARPUB |
| nightlife | CLUB |
| family | KIDS |

## Tests

```bash
npm test -- utils/__tests__/skiddle.test.ts
npm run smoke:events
EVENTS_API_BASE_URL=https://your-api.railway.app npm run smoke:events
curl -s https://your-api.railway.app/health/events
```

## Railway deploy

Railway auto-deploys from **`main`** (see `railway.toml`). The Skiddle merge code must be on the branch Railway builds — setting `SKIDDLE_API_KEY` alone is not enough if production is still running the Ticketmaster-only handler.

After merge/deploy, confirm:

1. `SKIDDLE_API_KEY` is set on the Railway **API service** (same service as `TICKETMASTER_API_KEY`).
2. `GET /health/events` returns `ok: true`, `source: "mixed"`, and `skiddle` > 0.
3. `npm run smoke:events` against the Railway URL shows Skiddle ids (`sk-*`).
