/** Netflix `/search` and home URLs often open the app without the title. */
export function isNetflixSearchOrGenericUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (!/netflix\.com/i.test(u.hostname)) return false;
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    if (!path || path === '/') return true;
    if (path === '/search' || path.startsWith('/search/')) return true;
    if (path === '/browse' || path.startsWith('/browse/')) return true;
    if (path === '/login' || path.startsWith('/login/')) return true;
    return false;
  } catch {
    return true;
  }
}

export function normalizeNetflixWatchUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (!/netflix\.com/i.test(u.hostname)) return url.trim();
    u.protocol = 'https:';
    u.hostname = 'www.netflix.com';
    u.hash = '';
    return u.toString();
  } catch {
    return url.trim();
  }
}

export function extractNetflixTitleOrWatchId(
  url: string,
): { kind: 'watch' | 'title'; id: string } | null {
  const watch = url.match(/netflix\.com\/watch\/(\d+)/i);
  if (watch) return { kind: 'watch', id: watch[1] };
  const title = url.match(/netflix\.com\/title\/(\d+)/i);
  if (title) return { kind: 'title', id: title[1] };
  return null;
}

function httpsToNflxScheme(httpsUrl: string): string | null {
  try {
    const u = new URL(httpsUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!/netflix\.com/i.test(u.hostname)) return null;
    return `nflx://${u.host}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** Ordered handoff: HTTPS universal link, then `nflx://` for the same path. */
export function buildNetflixOpenTargets(input: {
  url: string;
  resumeSeconds?: number | null;
}): string[] {
  const normalized = normalizeNetflixWatchUrl(input.url);
  if (isNetflixSearchOrGenericUrl(normalized)) return [];

  const resume =
    input.resumeSeconds != null && input.resumeSeconds > 0
      ? Math.floor(input.resumeSeconds)
      : null;

  const targets: string[] = [];
  const parsed = extractNetflixTitleOrWatchId(normalized);

  if (parsed) {
    const segment = parsed.kind === 'watch' ? 'watch' : 'title';
    const basePath = `/${segment}/${parsed.id}`;
    const httpsBase = `https://www.netflix.com${basePath}`;
    const nflxBase = `nflx://www.netflix.com${basePath}`;
    if (resume) {
      targets.push(`${httpsBase}?t=${resume}`);
      targets.push(`${nflxBase}?t=${resume}`);
    }
    targets.push(httpsBase);
    targets.push(nflxBase);
    return [...new Set(targets)];
  }

  if (resume && !/[?&]t=\d+/.test(normalized)) {
    const sep = normalized.includes('?') ? '&' : '?';
    targets.push(`${normalized}${sep}t=${resume}`);
  }
  targets.push(normalized);
  const nflx = httpsToNflxScheme(normalized);
  if (nflx) targets.push(nflx);

  return [...new Set(targets.filter(Boolean))];
}

export function buildNetflixWatchUrlFromTitleId(titleId: string): string {
  const id = titleId.replace(/\D/g, '');
  return `https://www.netflix.com/title/${id}`;
}
