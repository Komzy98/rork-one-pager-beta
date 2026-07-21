/** Shared when Ticketmaster/Skiddle/catalog rows have no artwork. */
export const DEFAULT_EVENT_POSTER_URL =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600';

export function resolveEventPosterUrl(image?: string | null): string {
  const trimmed = image?.trim();
  if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed;
  return DEFAULT_EVENT_POSTER_URL;
}

export function pickEventPosterUrl(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed;
  }
  return DEFAULT_EVENT_POSTER_URL;
}
