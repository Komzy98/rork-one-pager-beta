export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.startsWith('/event/')) {
    const id = decodeURIComponent(path.replace(/^\/event\//, '').split('?')[0] ?? '');
    if (id) return `/(root)/event/${id}`;
  }
  if (path.startsWith('/invite/')) {
    const token = decodeURIComponent(path.replace(/^\/invite\//, '').split('?')[0] ?? '');
    if (token) return `/invite/${token}`;
  }
  return '/';
}
