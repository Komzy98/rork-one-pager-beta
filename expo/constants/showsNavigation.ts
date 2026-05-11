/** Movies & TV sub-tab routes (`ShowsScreen` reads `tab` via `useLocalSearchParams`). */
export const SHOWS_HREF = {
  streaming: '/shows?tab=streaming',
  watchlist: '/shows?tab=watchlist',
  forYou: '/shows?tab=for-you',
  aroundYou: '/shows?tab=around-you',
} as const;
