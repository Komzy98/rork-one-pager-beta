import { getSkiddleApiKeyFromEnv } from '@/backend/utils/skiddleApiKey';
import { getTicketmasterApiKeyFromEnv } from '@/backend/utils/ticketmasterApiKey';
import type { LocalEvent } from '@/types/events';
import { buildSkiddleEventDetailUrl, parseSkiddleError } from '@/utils/skiddleQuery';
import { buildTicketmasterEventDetailUrl, parseTicketmasterFault } from '@/utils/ticketmasterQuery';
import { mapSkiddleSingleResponse } from '@/utils/skiddleTransform';
import { mapTicketmasterSingleResponse } from '@/utils/ticketmasterTransform';

async function fetchJsonWithTimeout(url: string, label: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`❌ ${label} HTTP ${response.status}`);
      return null;
    }

    return payload;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`💥 ${label} fetch error:`, error);
    return null;
  }
}

export function parseCompoundEventId(
  compoundId: string,
): { source: 'ticketmaster' | 'skiddle'; rawId: string } | null {
  const id = compoundId.trim();
  if (id.startsWith('tm-')) return { source: 'ticketmaster', rawId: id.slice(3) };
  if (id.startsWith('sk-')) return { source: 'skiddle', rawId: id.slice(3) };
  return null;
}

async function fetchTicketmasterEventById(rawId: string): Promise<LocalEvent | null> {
  const apiKey = getTicketmasterApiKeyFromEnv();
  if (!apiKey) return null;

  const url = buildTicketmasterEventDetailUrl(apiKey, rawId);
  const payload = await fetchJsonWithTimeout(url, 'Ticketmaster event');
  if (!payload) return null;

  const fault = parseTicketmasterFault(payload);
  if (fault) {
    console.error(`❌ Ticketmaster event detail: ${fault}`);
    return null;
  }

  return mapTicketmasterSingleResponse(payload);
}

async function fetchSkiddleEventById(rawId: string): Promise<LocalEvent | null> {
  const apiKey = getSkiddleApiKeyFromEnv();
  if (!apiKey) return null;

  const url = buildSkiddleEventDetailUrl(apiKey, rawId);
  const payload = await fetchJsonWithTimeout(url, 'Skiddle event');
  if (!payload) return null;

  const error = parseSkiddleError(payload);
  if (error) {
    console.error(`❌ Skiddle event detail: ${error}`);
    return null;
  }

  return mapSkiddleSingleResponse(payload);
}

export async function fetchEventById(
  compoundId: string,
): Promise<{ event: LocalEvent; source: 'ticketmaster' | 'skiddle' } | null> {
  const parsed = parseCompoundEventId(compoundId);
  if (!parsed) return null;

  const event =
    parsed.source === 'ticketmaster'
      ? await fetchTicketmasterEventById(parsed.rawId)
      : await fetchSkiddleEventById(parsed.rawId);

  if (!event) return null;
  return { event, source: parsed.source };
}
