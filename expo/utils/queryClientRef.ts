import type { QueryClient } from '@tanstack/react-query';

let queryClient: QueryClient | null = null;

export function registerQueryClient(client: QueryClient): void {
  queryClient = client;
}

/** Drop per-user social/event caches when signing out or switching accounts. */
export function clearUserScopedQueries(): void {
  if (!queryClient) return;
  queryClient.removeQueries({ queryKey: ['event-plan'] });
  queryClient.removeQueries({ queryKey: ['friends-going'] });
  queryClient.removeQueries({ queryKey: ['guest-rsvps'] });
  queryClient.removeQueries({ queryKey: ['saved-events-social'] });
  queryClient.removeQueries({ queryKey: ['social'] });
  queryClient.removeQueries({ queryKey: ['activity'] });
  queryClient.removeQueries({ queryKey: ['trending-all'] });
  queryClient.removeQueries({ queryKey: ['popular-all'] });
  queryClient.removeQueries({ queryKey: ['top-rated-all'] });
  queryClient.removeQueries({ queryKey: ['region-trending'] });
  queryClient.removeQueries({ queryKey: ['now-playing-movies'] });
  queryClient.removeQueries({ queryKey: ['on-the-air-tv'] });
  queryClient.removeQueries({ queryKey: ['airing-today-tv'] });
  queryClient.removeQueries({ queryKey: ['new-episodes-enriched'] });
  queryClient.removeQueries({ queryKey: ['younify'] });
}

/** Nuclear option on sign-out / account switch — prevents React Query serving prior user's TMDB/social rows. */
export function purgeAllReactQueryCaches(): void {
  if (!queryClient) return;
  queryClient.clear();
}
