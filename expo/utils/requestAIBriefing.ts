import { createTRPCClient, httpLink } from '@trpc/client';
import type { AppRouter } from '@/backend/trpc/app-router';
import { supabase } from '@/utils/supabaseClient';
import { getMetroApiBaseUrl } from '@/utils/metroApiBaseUrl';
import type { BriefingAIRequest } from './aiBriefingFocus';
import { loadAIBriefingPreferences } from './aiBriefingPreferences';

export async function requestAIBriefing(input: BriefingAIRequest, expectedUserId: string): Promise<string | null> {
  if (!expectedUserId || expectedUserId === 'guest' || !input.items.length) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || session.user?.id !== expectedUserId) return null;
  // Re-check consent after the asynchronous session lookup, immediately before
  // constructing any network request. A stale Overview snapshot must fail closed.
  const preferences = await loadAIBriefingPreferences(expectedUserId);
  if (!preferences.enabled || input.items.some(item => preferences.sources[item.source] !== true)) return null;
  const base = getMetroApiBaseUrl().replace(/\/+$/, '');
  const url = base.toLowerCase().endsWith('/api') ? base + '/trpc' : base + '/api/trpc';

  // A dedicated authenticated client ensures bearer tokens are not forwarded
  // to public data providers or leaked via query parameters.
  const client = createTRPCClient<AppRouter>({
    links: [httpLink({
      url,
      headers: () => ({ authorization: 'Bearer ' + session.access_token }),
      fetch: async (requestUrl, init) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8500);
        try {
          return await fetch(requestUrl, { ...init, signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
      },
    })],
  });

  try {
    const result = await client.ai.enrichBriefing.mutate(input);
    return result.mode === 'ai' ? result.insight : null;
  } catch {
    // Timeouts, missing configuration and network failures never block the day recap.
    return null;
  }
}
