export const SCROLLABLE_TAB_CANONICAL_ORDER = [
  'shows',
  'sports',
  'cooking',
  'learning',
  'events',
  'tasks',
  'discover',
];

const PINNED_TABS = new Set(['activities', 'profile']);

export function sortMiddleTabsByUsage(
  tabs: string[],
  visitCounts: Record<string, number> | undefined,
  canonicalOrder: string[] = SCROLLABLE_TAB_CANONICAL_ORDER,
): string[] {
  const middle = tabs.filter((tab) => !PINNED_TABS.has(tab));

  middle.sort((a, b) => {
    const countA = visitCounts?.[a] ?? 0;
    const countB = visitCounts?.[b] ?? 0;
    if (countB !== countA) {
      return countB - countA;
    }

    const indexA = canonicalOrder.indexOf(a);
    const indexB = canonicalOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const result: string[] = [];
  if (tabs.includes('activities')) {
    result.push('activities');
  }
  result.push(...middle);
  if (tabs.includes('profile')) {
    result.push('profile');
  }
  return result;
}

export function mergeTabVisitCounts(
  older?: Record<string, number>,
  newer?: Record<string, number>,
): Record<string, number> | undefined {
  if (!older && !newer) {
    return undefined;
  }

  const merged: Record<string, number> = { ...(older ?? {}) };
  for (const [tab, count] of Object.entries(newer ?? {})) {
    merged[tab] = Math.max(merged[tab] ?? 0, count);
  }
  return merged;
}
