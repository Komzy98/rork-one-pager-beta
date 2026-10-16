/** Never invent a generic poster that falsely depicts a real event. */
export const DEFAULT_EVENT_POSTER_URL = '';

export function isUsableEventPosterUrl(image?: string | null): boolean {
  const candidate = image?.trim() ?? '';
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    if (/^(localhost|127\.0\.0\.1)$/i.test(url.hostname)) return false;
    // Provider thumbnail URLs are unsuitable for full-screen artwork.
    const width = url.searchParams.get('width') ?? url.searchParams.get('w');
    if (width && /^\d+$/.test(width) && Number(width) < 220) return false;
    return true;
  } catch {
    return false;
  }
}

export function resolveEventPosterUrl(image?: string | null): string {
  return isUsableEventPosterUrl(image) ? image!.trim() : DEFAULT_EVENT_POSTER_URL;
}

export function pickEventPosterUrl(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (isUsableEventPosterUrl(candidate)) return candidate!.trim();
  }
  return DEFAULT_EVENT_POSTER_URL;
}
