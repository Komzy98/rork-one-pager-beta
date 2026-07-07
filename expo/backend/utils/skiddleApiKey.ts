/** Skiddle Events API key — server-side only. */
export function getSkiddleApiKeyFromEnv(): string {
  return (
    process.env.SKIDDLE_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_SKIDDLE_API_KEY?.trim() ||
    ''
  );
}
