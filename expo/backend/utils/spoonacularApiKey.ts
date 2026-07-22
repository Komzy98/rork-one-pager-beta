export function getSpoonacularApiKeyFromEnv(): string | null {
  const key =
    process.env.SPOONACULAR_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY?.trim() ||
    null;
  return key && key.length > 8 ? key : null;
}
