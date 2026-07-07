# Football API — one deploy story

The Sports tab loads fixtures through **tRPC** (`football.getMatchesBundle`). Where that API runs depends on how you built the app — not on magic.

## Where the app sends football requests

| Build | `EXPO_PUBLIC_RORK_API_BASE_URL` | Football API hits |
|--------|----------------------------------|-------------------|
| **iOS Simulator / local dev** (typical) | *unset* | **Metro** on `:8081` (same machine as the packager; code from your git checkout) |
| **iOS Simulator** (explicit env) | `https://…railway.app` | **Railway** production API |
| **TestFlight / App Store (EAS)** | set in EAS secrets | **Railway** (`EXPO_PUBLIC_RORK_API_BASE_URL`) |

There is no third path: if TestFlight behaves differently from the simulator, compare these two columns first.

### Client logs (dev)

On launch, Metro prints one of:

- `🎯 Using env base URL:` → TestFlight-style Railway URL
- `🎯 Derived base URL from Expo hostUri:` → local Metro backend

See `lib/trpc.ts` → `getBaseUrl()`.

## Railway (production API)

1. **Service root:** `expo/` (not repo root).
2. **Branch:** `main` — enable *Deploy on push* so Railway always matches `main`.
3. **Start command:** `npx tsx backend/serve.ts` (also in `railway.toml`).
4. **Required env on Railway:**
   - `FOOTBALL_API_KEY` or `EXPO_PUBLIC_FOOTBALL_API_KEY` (API-Sports)
   - `YOUNIFY_MANAGEMENT_API_KEY` (streaming auth — see [YOUNIFY_AUTH.md](./YOUNIFY_AUTH.md))
   - `SUPABASE_*` if you use account deletion / server features
5. **Health checks:**
   - `GET /health` — process up, key configured
   - `GET /health/football` — **World Cup For You smoke** (`teamIds: []`, `leagueIds: [1]`, expects ≥1 live or upcoming fixture)

Railway should use `healthcheckPath = /health/football` (see `railway.toml`).

Production URL (example): set `EXPO_PUBLIC_RORK_API_BASE_URL` in EAS to the Railway public URL **without** `/api/trpc`.

## CI smoke test

Workflow: [`.github/workflows/football-api.yml`](../../.github/workflows/football-api.yml)

- **On every PR / push to `main`** (backend paths): starts local API, runs `scripts/smoke-football-api.mjs`.
- **Manual production check:** GitHub → Actions → *Football API* → *Run workflow* → optional `api_base_url` (or set repo variable `FOOTBALL_API_BASE_URL`).

GitHub secret: `FOOTBALL_API_KEY` (API-Sports key for CI).

### Run smoke locally

```bash
cd expo
npm run api:public          # terminal 1 — port 3000
npm run smoke:football      # terminal 2
```

Against Railway:

```bash
FOOTBALL_API_BASE_URL=https://your-service.up.railway.app npm run smoke:football
```

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| Simulator OK, TestFlight empty WC feed | EAS build points at Railway; Railway deploy is **stale** or **crashed** — hit `/health/football` |
| `errors.config` in bundle | `FOOTBALL_API_KEY` missing on the **server** process |
| 0 upcoming on `/health/football` | Old server code (pre–World Cup season fix) or API key quota — check Railway logs |
| Simulator uses old logic | Metro bundle is current; you’re not comparing the same backend as TestFlight |

## Related (not football)

- **Younify streaming:** simulator dev uses `:3000` (`npm run dev`). Production uses the same Railway host — see [YOUNIFY_AUTH.md](./YOUNIFY_AUTH.md).
- **Supabase:** client auth/sync — see `SUPABASE_SETUP.md`.
