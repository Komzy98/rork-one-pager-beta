/** Disney+ universal links do not include `/search` — those URLs open the app home without the title. */
export function isDisneyPlusSearchOrGenericUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (!/disneyplus\.com/i.test(u.hostname)) return false;
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    if (!path || path === "/") return true;
    if (path.endsWith("/search") || path.includes("/search/")) return true;
    if (path.includes("/get-app")) return true;
    return false;
  } catch {
    return true;
  }
}

export function normalizeDisneyPlusWatchUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (!/disneyplus\.com/i.test(u.hostname)) return url.trim();
    u.protocol = "https:";
    u.hostname = "www.disneyplus.com";
    u.searchParams.delete("irclickid");
    u.hash = "";
    return u.toString();
  } catch {
    return url.trim();
  }
}

export function extractDisneyPlusUrlFromText(text: string): string | null {
  const m = text.match(/https?:\/\/(?:[a-z0-9-]+\.)*disneyplus\.com[^\s"'<>]*/i);
  if (!m) return null;
  const normalized = normalizeDisneyPlusWatchUrl(m[0]);
  if (isDisneyPlusSearchOrGenericUrl(normalized)) return null;
  return normalized;
}

function httpsToDisneyPlusScheme(httpsUrl: string): string | null {
  try {
    const u = new URL(httpsUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!/disneyplus\.com/i.test(u.hostname)) return null;
    return `disneyplus://${u.host}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** HTTPS play/series/movie URLs first, then `/video/` → `/play/`, then native scheme. */
export function buildDisneyPlusOpenTargets(url: string): string[] {
  const normalized = normalizeDisneyPlusWatchUrl(url);
  if (isDisneyPlusSearchOrGenericUrl(normalized)) return [];

  const attempts = [normalized];
  if (/\/video\/[0-9a-f-]{36}/i.test(normalized)) {
    attempts.push(normalized.replace(/\/video\//i, '/play/'));
  }

  const targets: string[] = [];
  for (const httpsUrl of attempts) {
    targets.push(httpsUrl);
    const native = httpsToDisneyPlusScheme(httpsUrl);
    if (native) targets.push(native);
  }
  return [...new Set(targets)];
}
