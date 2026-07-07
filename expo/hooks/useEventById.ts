import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { registerDiscoveryEvents } from '@/utils/eventCatalog';
import type { LocalEvent } from '@/types/events';

export function useEventById(eventId: string | undefined, enabled: boolean) {
  const query = trpc.events.getById.useQuery(
    { id: eventId ?? '' },
    {
      enabled: enabled && !!eventId,
      staleTime: 10 * 60 * 1000,
      retry: 1,
    },
  );

  useEffect(() => {
    if (query.data?.event) {
      registerDiscoveryEvents([query.data.event]);
    }
  }, [query.data?.event]);

  return {
    event: (query.data?.event ?? null) as LocalEvent | null,
    source: query.data?.source ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
