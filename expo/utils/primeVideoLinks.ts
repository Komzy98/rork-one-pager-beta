export const PRIME_VIDEO_APP_ORIGIN = 'https://app.primevideo.com';

/** Prime Video catalog search — opens the app via universal links on iOS/Android. */
export function buildPrimeVideoSearchUrl(title: string): string {
  const phrase = title.trim();
  if (!phrase) return PRIME_VIDEO_APP_ORIGIN;
  return `${PRIME_VIDEO_APP_ORIGIN}/search?phrase=${encodeURIComponent(phrase)}`;
}

export function extractAsinFromAmazonStyleVideoUrl(url: string): string | null {
  const m = url.match(/\/(?:gp\/video\/|video\/)?detail\/([A-Z0-9]{10})(?:[\/?#]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

export function extractAsinFromPrimeUrl(url: string): string | null {
  const fromPath = extractAsinFromAmazonStyleVideoUrl(url);
  if (fromPath) return fromPath;
  const m = url.match(/[?&]asin=([A-Z0-9]{10})(?:&|$|#)/i);
  return m ? m[1].toUpperCase() : null;
}

export function extractGtiFromPrimeUrl(url: string): string | null {
  const m = url.match(/[?&]gti=([^&#]+)/i);
  if (!m) return null;
  try {
    const gti = decodeURIComponent(m[1]).trim();
    return gti.includes('amzn1.') ? gti : null;
  } catch {
    return null;
  }
}

/** Legacy `aiv://` punchout links → HTTPS universal links (more reliable on current Prime builds). */
export function convertAivSchemeToPrimeVideoHttps(url: string): string | null {
  if (!url.trim().toLowerCase().startsWith('aiv://')) return null;
  const gti = extractGtiFromPrimeUrl(url);
  if (gti) {
    return `${PRIME_VIDEO_APP_ORIGIN}/detail?gti=${encodeURIComponent(gti)}`;
  }
  const asin = extractAsinFromPrimeUrl(url);
  if (asin) {
    return `${PRIME_VIDEO_APP_ORIGIN}/detail/${asin}`;
  }
  return PRIME_VIDEO_APP_ORIGIN;
}

export function buildPrimeVideoDetailUrl(input: {
  asin?: string | null;
  gti?: string | null;
}): string | null {
  const gti = input.gti?.trim();
  if (gti && gti.includes('amzn1.')) {
    return `${PRIME_VIDEO_APP_ORIGIN}/detail?gti=${encodeURIComponent(gti)}`;
  }
  const asin = input.asin?.trim().toUpperCase();
  if (asin && /^[A-Z0-9]{10}$/.test(asin)) {
    return `${PRIME_VIDEO_APP_ORIGIN}/detail/${asin}`;
  }
  return null;
}

/** Ordered handoff targets: universal link first, native `aiv://` as fallback. */
export function buildPrimeVideoOpenTargets(input: {
  url: string;
  asin?: string | null;
  gti?: string | null;
  resumeSeconds?: number | null;
}): string[] {
  const targets: string[] = [];
  const normalized = normalizePrimeVideoWatchUrl(input.url);
  const asin = input.asin ?? extractAsinFromPrimeUrl(input.url) ?? extractAsinFromPrimeUrl(normalized);
  const gti = input.gti ?? extractGtiFromPrimeUrl(input.url) ?? extractGtiFromPrimeUrl(normalized);

  const detail = buildPrimeVideoDetailUrl({ asin, gti });
  if (detail && input.resumeSeconds != null && input.resumeSeconds > 0) {
    const sep = detail.includes('?') ? '&' : '?';
    targets.push(`${detail}${sep}startTime=${Math.floor(input.resumeSeconds)}`);
  }
  if (detail) targets.push(detail);

  if (normalized.includes('app.primevideo.com')) {
    targets.push(normalized);
  }

  if (gti) {
    targets.push(`aiv://aiv/detail?gti=${encodeURIComponent(gti)}`);
  }
  if (asin) {
    targets.push(`aiv://aiv/watch?asin=${asin}`);
    targets.push(`aiv://aiv/resume?asin=${asin}`);
  }

  targets.push('aiv://');
  targets.push(PRIME_VIDEO_APP_ORIGIN);

  return [...new Set(targets.filter(Boolean))];
}

/**
 * Raw `amazon.com/gp/video/detail/...` links often open in the browser; `app.primevideo.com/detail/...`
 * is registered with the Prime Video app on iOS/Android and resumes Continue watching reliably.
 */
export function normalizePrimeVideoWatchUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return url;

  const lower = trimmed.toLowerCase();

  if (lower.startsWith('aiv://')) {
    return convertAivSchemeToPrimeVideoHttps(trimmed) ?? PRIME_VIDEO_APP_ORIGIN;
  }

  if (!lower.includes('amazon') && !lower.includes('primevideo')) return url;

  try {
    if (lower.includes('app.primevideo.com')) return trimmed;

    if (lower.includes('amazon.') && (lower.includes('i=instant-video') || /\/s(?:earch)?\?/.test(lower))) {
      try {
        const u = new URL(trimmed);
        const phrase =
          u.searchParams.get('k') ??
          u.searchParams.get('phrase') ??
          u.searchParams.get('q') ??
          u.searchParams.get('field-keywords');
        if (phrase?.trim()) return buildPrimeVideoSearchUrl(phrase.trim());
      } catch {
        /* fall through */
      }
      return PRIME_VIDEO_APP_ORIGIN;
    }

    if (lower.includes('amazon.') && lower.includes('/gp/video') && !lower.includes('/detail')) {
      return PRIME_VIDEO_APP_ORIGIN;
    }

    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);

    if (u.hostname.toLowerCase().includes('primevideo.com')) {
      u.hostname = 'app.primevideo.com';
      return u.toString();
    }

    if (u.hostname.toLowerCase().startsWith('watch.amazon.')) {
      const watchGti = u.searchParams.get('gti');
      if (watchGti?.includes('amzn1.')) {
        return `${PRIME_VIDEO_APP_ORIGIN}/detail?gti=${encodeURIComponent(watchGti)}`;
      }
      u.hostname = 'app.primevideo.com';
      return u.toString();
    }

    const gti = extractGtiFromPrimeUrl(trimmed);
    if (gti) {
      return `${PRIME_VIDEO_APP_ORIGIN}/detail?gti=${encodeURIComponent(gti)}`;
    }

    const asinParam = u.searchParams.get('asin');
    if (asinParam && /^[A-Z0-9]{10}$/i.test(asinParam)) {
      return `${PRIME_VIDEO_APP_ORIGIN}/detail/${asinParam.toUpperCase()}`;
    }

    const asin = extractAsinFromAmazonStyleVideoUrl(trimmed);
    if (asin) {
      return `${PRIME_VIDEO_APP_ORIGIN}/detail/${asin}`;
    }

    if (lower.includes('amazon.') && (lower.includes('/gp/video') || lower.includes('/video/'))) {
      return PRIME_VIDEO_APP_ORIGIN;
    }
  } catch {
    /* keep original */
  }
  return url;
}

export function isPrimeVideoProviderId(providerId: number | null | undefined): boolean {
  if (providerId == null) return false;
  return providerId === 9 || providerId === 10 || providerId === 119 || providerId === 2100;
}
