/**
 * API-Sports (api-football.com) key for **server-side** tRPC / Hono routes.
 *
 * Prefer `FOOTBALL_API_KEY` in production (secret, not in the app bundle).
 * Falls back to `EXPO_PUBLIC_FOOTBALL_API_KEY` so local `.env` / Rork setups
 * that only define the Expo key still populate sports data via tRPC.
 */
export function getFootballApiKeyFromEnv(): string {
  return (
    process.env.FOOTBALL_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_FOOTBALL_API_KEY?.trim() ||
    ""
  );
}

/**
 * MMA uses `v1.mma.api-sports.io`. Dashboard must enable the MMA API for your key.
 * Optional dedicated key; otherwise the football API-Sports key is used (same account).
 */
export function getMmaApiKeyFromEnv(): string {
  return (
    process.env.MMA_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_MMA_API_KEY?.trim() ||
    getFootballApiKeyFromEnv()
  );
}
