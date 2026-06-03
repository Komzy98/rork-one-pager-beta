/** Stats derived from loaded MMA feed — not official UFC rankings. */

export type UfcFightForStats = {
  status: 'Upcoming' | 'Live' | 'Completed';
  date: string;
  category: string;
  fighter1: { name: string; winner?: boolean };
  fighter2: { name: string; winner?: boolean };
  result?: { method?: string };
  statusShort?: string;
};

export type UfcEventGroup = {
  event: string;
  date: string;
  fights: UfcFightForStats[];
};

export type UfcStatCell = {
  label: string;
  value: number;
  active?: boolean;
};

export function isKoTkoFinish(fight: UfcFightForStats): boolean {
  const s = (fight.statusShort ?? '').toUpperCase();
  if (s === 'KO' || s === 'TKO') return true;
  const m = (fight.result?.method ?? '').toLowerCase();
  return /\b(ko|tko)\b/.test(m);
}

export function isSubmissionFinish(fight: UfcFightForStats): boolean {
  const s = (fight.statusShort ?? '').toUpperCase();
  if (s === 'SUB') return true;
  const m = (fight.result?.method ?? '').toLowerCase();
  return /\bsub/.test(m);
}

export function fightHasRecordedWinner(fight: UfcFightForStats): boolean {
  if (fight.status !== 'Completed') return false;
  return fight.fighter1.winner === true || fight.fighter2.winner === true;
}

export function computeUfcStatsRow(
  tab: 'upcoming' | 'results',
  displayFights: UfcFightForStats[],
  groupedEvents: UfcEventGroup[],
): UfcStatCell[] {
  const fightsCount = displayFights.length;
  const eventsCount = groupedEvents.length;

  if (tab === 'upcoming') {
    const nextEvent = groupedEvents[0];
    const nextCardFights = nextEvent?.fights.length ?? 0;
    let daysUntil = 0;
    if (nextEvent?.date) {
      const t = new Date(nextEvent.date).getTime();
      if (!Number.isNaN(t)) {
        daysUntil = Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
      }
    }
    return [
      { label: 'FIGHTS', value: fightsCount, active: true },
      { label: 'EVENTS', value: eventsCount },
      { label: 'NEXT CARD', value: nextCardFights },
      { label: 'IN DAYS', value: daysUntil },
    ];
  }

  const decided = displayFights.filter(fightHasRecordedWinner).length;
  const divisions = new Set(
    displayFights.map((f) => f.category).filter((c) => c && c !== 'TBD'),
  ).size;

  return [
    { label: 'RESULTS', value: fightsCount, active: true },
    { label: 'EVENTS', value: eventsCount },
    { label: 'DECIDED', value: decided },
    { label: 'DIVISIONS', value: divisions },
  ];
}

/** Overall win counts from completed bouts in the results feed. */
export function computeUfcWinLeaderboard(resultsFights: UfcFightForStats[], limit = 20) {
  const wins = new Map<string, { name: string; wins: number }>();
  const addWin = (name: string) => {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!key || key === 'tba') return;
    const prev = wins.get(key);
    if (prev) prev.wins += 1;
    else wins.set(key, { name: trimmed, wins: 1 });
  };

  for (const f of resultsFights) {
    if (f.status !== 'Completed') continue;
    if (f.fighter1.winner) addWin(f.fighter1.name);
    else if (f.fighter2.winner) addWin(f.fighter2.name);
  }

  return Array.from(wins.values())
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Most wins in each weight class within the loaded results feed. */
export function computeUfcDivisionLeaders(resultsFights: UfcFightForStats[]) {
  const byCategory = new Map<string, Map<string, { name: string; wins: number }>>();

  const addWin = (category: string, name: string) => {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!key || key === 'tba') return;
    let catMap = byCategory.get(category);
    if (!catMap) {
      catMap = new Map();
      byCategory.set(category, catMap);
    }
    const prev = catMap.get(key);
    if (prev) prev.wins += 1;
    else catMap.set(key, { name: trimmed, wins: 1 });
  };

  for (const f of resultsFights) {
    if (f.status !== 'Completed') continue;
    const cat = f.category?.trim() || 'Open Weight';
    if (f.fighter1.winner) addWin(cat, f.fighter1.name);
    else if (f.fighter2.winner) addWin(cat, f.fighter2.name);
  }

  return Array.from(byCategory.entries())
    .map(([category, winMap]) => {
      const top = [...winMap.values()].sort(
        (a, b) => b.wins - a.wins || a.name.localeCompare(b.name),
      )[0];
      return { category, name: top?.name ?? '—', wins: top?.wins ?? 0 };
    })
    .filter((row) => row.wins > 0)
    .sort((a, b) => a.category.localeCompare(b.category));
}
