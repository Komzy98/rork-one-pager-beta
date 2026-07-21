import type { UserProfile } from '@/types/habit';

export type DailyStackItem = {
  id: string;
  emoji: string;
  label: string;
  detail: string;
};

export type BuildDailyStackInput = {
  profile: UserProfile | null | undefined;
  habitCount?: number;
  completedHabits?: number;
  continueWatchingTitle?: string | null;
  tonightMatchLabel?: string | null;
  partnerCount?: number;
};

const HABIT_INTERESTS = new Set(['fitness', 'productivity', 'learning', 'cooking', 'work']);
const SPORTS_INTERESTS = new Set(['football', 'f1', 'ufc', 'nba']);

export function buildDailyStackItems(input: BuildDailyStackInput): DailyStackItem[] {
  const { profile } = input;
  const interests = profile?.interests ?? [];
  const items: DailyStackItem[] = [];

  const hasHabits =
    interests.some((id) => HABIT_INTERESTS.has(id)) || (input.habitCount ?? 0) > 0;
  if (hasHabits) {
    const total = input.habitCount ?? 0;
    const done = input.completedHabits ?? 0;
    items.push({
      id: 'habits',
      emoji: '✅',
      label: 'Show up',
      detail: total > 0 ? `${done}/${total} for today` : 'Add a daily rhythm in Tasks',
    });
  }

  if (interests.some((id) => SPORTS_INTERESTS.has(id))) {
    const team = profile?.favoriteTeams?.[0]?.name;
    items.push({
      id: 'sports',
      emoji: '⚽',
      label: 'Your teams',
      detail:
        input.tonightMatchLabel ??
        (team ? `${team} — scores & tonight` : 'Live scores & fixtures'),
    });
  }

  if (interests.includes('movies')) {
    items.push({
      id: 'shows',
      emoji: '📺',
      label: 'Unwind',
      detail: input.continueWatchingTitle
        ? `Continue ${input.continueWatchingTitle}`
        : 'Pick up where you left off',
    });
  }

  if (interests.includes('events')) {
    items.push({
      id: 'events',
      emoji: '🎟️',
      label: 'Plans',
      detail: 'Nights out & tickets nearby',
    });
  }

  if (interests.includes('cooking')) {
    items.push({
      id: 'cooking',
      emoji: '🍳',
      label: 'Cook well',
      detail: 'Meals that fit your week',
    });
  }

  const partners = input.partnerCount ?? 0;
  if (partners > 0) {
    items.push({
      id: 'partners',
      emoji: '🤝',
      label: 'People',
      detail: `${partners} person${partners === 1 ? '' : 's'} in your circle`,
    });
  } else if (hasHabits) {
    items.push({
      id: 'partners-invite',
      emoji: '🤝',
      label: 'People',
      detail: 'Optional — someone who helps you show up',
    });
  }

  return items.slice(0, 5);
}

/** One-line day picture: "Today: 2/5 show up · Arsenal tonight · Continue Severance" */
export function formatDailyStackHeadline(items: DailyStackItem[]): string | null {
  if (items.length === 0) return null;

  const snippets = items.map((item) => {
    if (item.id === 'habits' && item.detail.includes('/')) {
      return item.detail.replace(' for today', '');
    }
    if (item.id === 'sports') {
      if (item.detail.includes(' tonight')) return item.detail;
      return item.detail.replace(' — scores & tonight', ' tonight').replace('Live scores & fixtures', 'your teams');
    }
    if (item.id === 'shows' && item.detail.startsWith('Continue ')) {
      return item.detail;
    }
    if (item.id === 'shows') {
      return 'time to unwind';
    }
    if (item.id === 'events') {
      return 'plans nearby';
    }
    if (item.id === 'cooking') {
      return 'cook well';
    }
    if (item.id.startsWith('partners')) {
      return item.detail.toLowerCase();
    }
    return item.detail.toLowerCase();
  });

  return `Today: ${snippets.join(' · ')}`;
}
