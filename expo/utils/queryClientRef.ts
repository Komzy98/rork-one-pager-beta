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
}
