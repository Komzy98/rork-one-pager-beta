# Younify auth (streaming links)

Younify mints per-user SDK tokens via a small backend (`/create-younify-user`, `/refresh-younify-user-tokens`). The React Native app never holds the Younify **management** API key — only the server does.

## Local development (simulator)

**Default entry — starts auth + Metro + simulator:**

```bash
cd expo
npm run dev
```

Same as `npm run ios:sim` and `npm run ios:sim:full`.

What it does:

1. Starts Younify auth on **`:3000`** if not already healthy (`backend/younify-auth/server.js`)
2. Opens iOS Simulator and Expo dev client on **`:8081`**

Metro-only (no auth):

```bash
npm run ios:sim:metro-only
```

Auth only (second terminal):

```bash
npm run younify-auth
```

### In-app dev UX

- **Top banner** (simulator only): appears when `:3000/health` is down. **Start auth** copies/shares `npm run dev`; **Retry** re-checks health after you start the server.
- **Streaming onboarding / Profile → Streaming**: same panel with Start auth server + Retry + Continue without linking.

Requires `backend/younify-auth/.env`:

```env
YOUNIFY_MANAGEMENT_API_KEY=your_key
```

And client `.env`:

```env
EXPO_PUBLIC_YOUNIFY_SDK_KEY=your_sdk_key
```

## Production (TestFlight / App Store)

Physical devices **must not** use `127.0.0.1`. Auth routes are mounted on the **same Railway service** as the football API (`backend/hono.ts`):

| Route | Purpose |
|-------|---------|
| `POST /create-younify-user` | Mint tokens |
| `POST /refresh-younify-user-tokens` | Refresh tokens |
| `GET /health/younify` | Deploy smoke (management key configured) |

### Railway env (server)

Add to the existing `expo/` Railway service (same as `FOOTBALL_API_KEY`):

```env
YOUNIFY_MANAGEMENT_API_KEY=your_management_key
# optional:
YOUNIFY_MANAGEMENT_BASE_URL=https://api.younify.tv/v1
```

Redeploy after setting vars. Smoke:

```bash
curl -sS "$RAILWAY_URL/health/younify"
```

### EAS env (client)

Set on **preview** and **production** profiles in [expo.dev](https://expo.dev) → Project → Environment variables:

| Variable | Value |
|----------|--------|
| `EXPO_PUBLIC_YOUNIFY_SDK_KEY` | Younify Connect SDK key |
| `EXPO_PUBLIC_YOUNIFY_AUTH_URL` | Railway root URL, e.g. `https://your-app.up.railway.app` |
| `EXPO_PUBLIC_RORK_API_BASE_URL` | Same Railway URL (football tRPC) |

If `EXPO_PUBLIC_YOUNIFY_AUTH_URL` is omitted on device builds, the app falls back to `EXPO_PUBLIC_RORK_API_BASE_URL` (same host, no `/api/trpc` suffix).

Rebuild after changing EAS env vars (`eas build --profile production --platform ios`).

### URL resolution order (client)

1. `EXPO_PUBLIC_YOUNIFY_AUTH_URL` or `expo.extra.younifyAuthUrl`
2. `EXPO_PUBLIC_RORK_API_BASE_URL` on physical devices / production
3. Simulator dev: `http://127.0.0.1:3000`
4. Android emulator dev: `http://10.0.2.2:3000`

See `utils/younifyAuthUrl.ts` and `services/younify.ts`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “Younify auth unreachable at 127.0.0.1:3000” | Run `npm run dev` or `npm run younify-auth` |
| Streaming works in sim, not TestFlight | Set `EXPO_PUBLIC_YOUNIFY_AUTH_URL` + `YOUNIFY_MANAGEMENT_API_KEY` on Railway, rebuild |
| `/health/younify` returns 503 | `YOUNIFY_MANAGEMENT_API_KEY` missing on Railway |
| Missing SDK key | Set `EXPO_PUBLIC_YOUNIFY_SDK_KEY` in EAS |
