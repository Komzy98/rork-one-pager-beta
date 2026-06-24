import { getFootballApiKeyFromEnv } from '@/backend/utils/footballApiKey';

/** API-Sports Formula 1 (`v1.formula-1.api-sports.io`) — same account key as Football/MMA. */
export function getF1ApiKeyFromEnv(): string {
  return (
    process.env.F1_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_F1_API_KEY?.trim() ||
    getFootballApiKeyFromEnv()
  );
}
