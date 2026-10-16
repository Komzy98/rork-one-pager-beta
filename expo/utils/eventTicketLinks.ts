/** Only web destinations may launch from a provider ticket CTA. */
export function isUsableTicketLink(value?: string | null): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password || (url.port && url.port !== '443')) return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost') ||
        host.endsWith('.local') || host.endsWith('.internal') ||
        /^(127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
        /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}
