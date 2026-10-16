/** City centres, used for manual event discovery without a location permission. */
export const ONBOARDING_EVENT_CITIES = [
  { name: 'Manchester', latitude: 53.4808, longitude: -2.2426 },
  { name: 'London', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Birmingham', latitude: 52.4862, longitude: -1.8904 },
  { name: 'Liverpool', latitude: 53.4084, longitude: -2.9916 },
  { name: 'Leeds', latitude: 53.8008, longitude: -1.5491 },
  { name: 'Bristol', latitude: 51.4545, longitude: -2.5879 },
  { name: 'Glasgow', latitude: 55.8642, longitude: -4.2518 },
  { name: 'Edinburgh', latitude: 55.9533, longitude: -3.1883 },
] as const;

export type OnboardingEventCity = {
  name: string;
  latitude: number;
  longitude: number;
};
