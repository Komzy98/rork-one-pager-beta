import type { JoySources, UserProfile } from '@/types/habit';
import type { LocalEvent, SavedEventSnapshot } from '@/types/events';
import { getNationalitySignals } from '@/utils/nationalityPersonalization';
import { getChronotypeInfo } from '@/constants/chronotypes';
import type { Task } from '@/types/task';
import {
  eventsToBusyIntervals,
  type CalendarBusyEvent,
} from '@/utils/calendarHabitSlots';
import { getEventCalendarRange } from '@/utils/eventDiscovery';
import {
  getDaysUntilEvent,
  kmToMiles,
  parseEventStartDateTime,
} from '@/utils/eventDiscovery';
import { getBentoCategoryId, getLogicalCategoryIds } from '@/utils/eventCategories';
import { boostEventsForConciergeContext, type EventConciergeContext } from '@/utils/eventConcierge';

export type EventRecommendationReasonKind =
  | 'team'
  | 'interest'
  | 'saved_category'
  | 'joy'
  | 'nationality'
  | 'calendar'
  | 'timing'
  | 'distance'
  | 'trending'
  | 'budget'
  | 'live'
  | 'friends'
  | 'nba'
  | 'country'
  | 'book'
  | 'show'
  | 'habit'
  | 'identity'
  | 'recovery';

export interface EventRecommendationReason {
  kind: EventRecommendationReasonKind;
  label: string;
  priority: number;
}

export type EventDiscoveryTabKey = 'now' | 'near' | 'forYou' | 'friendsPicks' | 'thisWeek';

export interface EventRecommendationInput {
  profile: UserProfile | null | undefined;
  savedSnapshots?: SavedEventSnapshot[];
  calendarEvents?: CalendarBusyEvent[];
  discoveryTab?: EventDiscoveryTabKey;
  now?: Date;
  /** Merged manual + inferred joy picks (shows, habits, interests). */
  effectiveJoySources?: JoySources;
  /** Keywords from habit titles and descriptions. */
  habitKeywords?: string[];
  recoveryModeActive?: boolean;
  friendCountByEventId?: Map<string, number>;
}

export interface EventPersonalizationExtras {
  effectiveJoySources?: JoySources;
  habitKeywords?: string[];
  recoveryModeActive?: boolean;
}

export interface EventPersonalizationContext {
  interestKeywords: string[];
  interestIds: string[];
  categoryWeights: Map<string, number>;
  teamKeywords: string[];
  nbaTeamKeywords: string[];
  joyKeywords: string[];
  youtuberKeywords: string[];
  budgetKeywords: string[];
  nationalityKeywords: string[];
  countryKeywords: string[];
  bookKeywords: string[];
  habitKeywords: string[];
  identityGoalKeywords: string[];
  recoveryModeActive: boolean;
  highDiscovery: boolean;
}

const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  music: ['music', 'concert', 'live', 'afrobeats', 'rock', 'jazz', 'dj', 'festival'],
  sports: ['sport', 'football', 'soccer', 'gym', 'fitness', 'boxing', 'run', '5-a-side', 'match'],
  comedy: ['comedy', 'stand-up', 'standup', 'laugh'],
  theatre: ['theatre', 'theater', 'musical', 'acting', 'drama'],
  food: ['food', 'drink', 'cooking', 'restaurant', 'brunch', 'supper', 'culinary', 'wine'],
  arts: ['art', 'design', 'painting', 'creative', 'gallery', 'exhibition', 'museum'],
  tech: ['tech', 'ai', 'coding', 'startup', 'network', 'conference'],
  nightlife: ['night', 'party', 'club', 'nightlife'],
  fitness: ['fitness', 'gym', 'yoga', 'pilates', 'run club', 'workout', 'wellness', 'walk'],
  networking: ['network', 'meetup', 'professional', 'business'],
  family: ['family', 'kids', 'children', 'parent'],
};

/** Onboarding interest ids → event categories and search terms. */
const ONBOARDING_INTEREST_MAP: Record<string, { categories: string[]; keywords: string[] }> = {
  football: { categories: ['sports'], keywords: ['football', 'soccer', 'premier league', 'match'] },
  ufc: { categories: ['sports'], keywords: ['ufc', 'mma', 'boxing', 'fight'] },
  nba: { categories: ['sports'], keywords: ['nba', 'basketball'] },
  f1: { categories: ['sports', 'tech'], keywords: ['formula 1', 'f1', 'grand prix', 'motorsport'] },
  fitness: { categories: ['sports'], keywords: ['fitness', 'gym', 'workout', 'run club', 'yoga'] },
  movies: { categories: ['arts', 'theatre', 'music'], keywords: ['film', 'cinema', 'screening', 'premiere'] },
  cooking: { categories: ['food'], keywords: ['cooking', 'supper club', 'food festival', 'tasting'] },
  learning: { categories: ['tech'], keywords: ['workshop', 'talk', 'masterclass', 'lecture'] },
  events: { categories: ['music', 'comedy', 'theatre', 'food', 'arts'], keywords: ['festival', 'live'] },
  productivity: { categories: ['tech'], keywords: ['meetup', 'conference', 'networking'] },
};

const INTEREST_DISPLAY_NAMES: Record<string, string> = {
  football: 'football',
  ufc: 'UFC',
  nba: 'NBA',
  f1: 'Formula 1',
  fitness: 'fitness',
  movies: 'movies & TV',
  cooking: 'cooking',
  learning: 'learning',
  events: 'live events',
  productivity: 'productivity',
};

const RECOVERY_FRIENDLY_CATEGORIES = new Set(['arts', 'family', 'fitness', 'food', 'music']);

function pushKeywords(set: Set<string>, values: string[] | undefined): void {
  for (const v of values ?? []) {
    const t = v.trim().toLowerCase();
    if (t) set.add(t);
  }
}

export function extractHabitKeywords(habitTasks: Task[]): string[] {
  const keywords = new Set<string>();
  for (const task of habitTasks) {
    const blob = `${task.title} ${task.description ?? ''}`.toLowerCase();
    const title = task.title.trim().toLowerCase();
    if (title.length >= 4) keywords.add(title);
    if (/\byoga\b|\bmeditat/.test(blob)) keywords.add('yoga');
    if (/\brun|\bjog|\b5k\b|\bmarathon/.test(blob)) keywords.add('running');
    if (/\bwalk|\bhike/.test(blob)) keywords.add('walking');
    if (/\bgym|\blift|\bweights/.test(blob)) keywords.add('gym');
    if (/\bread|\bbook/.test(blob)) keywords.add('reading');
    if (/\bsocial|\bfriend/.test(blob)) keywords.add('social');
  }
  return [...keywords];
}

function mergeJoySources(manual?: JoySources | null, effective?: JoySources | null): JoySources {
  const out: JoySources = {};
  const keys: (keyof JoySources)[] = [
    'tvShows',
    'youtubers',
    'games',
    'music',
    'podcasts',
    'restaurants',
    'exerciseTypes',
  ];
  for (const key of keys) {
    const merged = [...(manual?.[key] ?? []), ...(effective?.[key] ?? [])]
      .map((v) => v.trim())
      .filter(Boolean);
    if (merged.length > 0) out[key] = [...new Set(merged.map((v) => v.toLowerCase()))];
  }
  return out;
}

export function buildEventPersonalizationContext(
  profile: UserProfile | null | undefined,
  extras?: EventPersonalizationExtras,
): EventPersonalizationContext {
  const interestKeywords = new Set<string>();
  const categoryWeights = new Map<string, number>();

  const interests = (profile?.interests ?? []).map((i) => i.toLowerCase());
  for (const interest of interests) {
    interestKeywords.add(interest);
    const onboarding = ONBOARDING_INTEREST_MAP[interest];
    if (onboarding) {
      for (const kw of onboarding.keywords) interestKeywords.add(kw);
      for (const cat of onboarding.categories) {
        categoryWeights.set(cat, (categoryWeights.get(cat) ?? 0) + 3);
      }
    }
    for (const [category, keys] of Object.entries(INTEREST_CATEGORY_MAP)) {
      if (keys.some((k) => interest.includes(k) || k.includes(interest))) {
        categoryWeights.set(category, (categoryWeights.get(category) ?? 0) + 2);
      }
    }
  }

  if ((profile?.favoriteTeams?.length ?? 0) > 0) {
    categoryWeights.set('sports', (categoryWeights.get('sports') ?? 0) + 3);
  }
  if ((profile?.favoriteNBATeams?.length ?? 0) > 0) {
    categoryWeights.set('sports', (categoryWeights.get('sports') ?? 0) + 3);
  }
  if (interests.includes('nba')) {
    categoryWeights.set('sports', (categoryWeights.get('sports') ?? 0) + 2);
  }

  for (const country of profile?.favoriteCountries ?? []) {
    categoryWeights.set('sports', (categoryWeights.get('sports') ?? 0) + 1);
    if (country.leagues.some((l) => /premier|la liga|serie|bundesliga/i.test(l))) {
      categoryWeights.set('sports', (categoryWeights.get('sports') ?? 0) + 1);
    }
  }

  const joyMerged = mergeJoySources(profile?.joySources, extras?.effectiveJoySources);
  const joyKeywords = new Set<string>();
  const youtuberKeywords = new Set<string>();
  pushKeywords(joyKeywords, joyMerged.music);
  pushKeywords(joyKeywords, joyMerged.games);
  pushKeywords(joyKeywords, joyMerged.tvShows);
  pushKeywords(joyKeywords, joyMerged.podcasts);
  pushKeywords(joyKeywords, joyMerged.restaurants);
  pushKeywords(joyKeywords, joyMerged.exerciseTypes);
  pushKeywords(youtuberKeywords, joyMerged.youtubers);

  for (const ex of joyMerged.exerciseTypes ?? []) {
    categoryWeights.set('fitness', (categoryWeights.get('fitness') ?? 0) + 2);
    if (/run|walk|hike/i.test(ex)) categoryWeights.set('fitness', (categoryWeights.get('fitness') ?? 0) + 1);
  }
  for (const rest of joyMerged.restaurants ?? []) {
    categoryWeights.set('food', (categoryWeights.get('food') ?? 0) + 1);
  }
  for (const show of joyMerged.tvShows ?? []) {
    if (/comedy|stand.?up/i.test(show)) categoryWeights.set('comedy', (categoryWeights.get('comedy') ?? 0) + 1);
  }

  const teamKeywords = (profile?.favoriteTeams ?? []).flatMap((t) => [
    t.name.toLowerCase(),
    ...(t.shortName ? [t.shortName.toLowerCase()] : []),
  ]);

  const nbaTeamKeywords = (profile?.favoriteNBATeams ?? []).flatMap((t) => [
    t.name.toLowerCase(),
    t.abbreviation.toLowerCase(),
  ]);

  const countryKeywords = new Set<string>();
  for (const country of profile?.favoriteCountries ?? []) {
    pushKeywords(countryKeywords, [country.name, country.code]);
    pushKeywords(countryKeywords, country.leagues);
  }

  const bookKeywords = new Set<string>();
  for (const book of profile?.favoriteBooks ?? []) {
    pushKeywords(bookKeywords, [book.title, book.author]);
  }

  const habitKeywords = new Set<string>(extras?.habitKeywords ?? []);
  for (const kw of habitKeywords) {
    if (/yoga|pilates|meditat/i.test(kw)) categoryWeights.set('fitness', (categoryWeights.get('fitness') ?? 0) + 1);
    if (/read|book/i.test(kw)) categoryWeights.set('arts', (categoryWeights.get('arts') ?? 0) + 1);
  }

  const identityGoalKeywords = new Set<string>();
  for (const goal of profile?.identityGoals ?? []) {
    const trimmed = goal.trim().toLowerCase();
    if (trimmed.length >= 4) identityGoalKeywords.add(trimmed);
    for (const word of trimmed.split(/\s+/)) {
      if (word.length >= 5) identityGoalKeywords.add(word);
    }
  }

  const budgetKeywords: string[] = [];
  if (interests.some((i) => i.includes('budget') || i.includes('free') || i.includes('cheap'))) {
    budgetKeywords.push('free', 'cheap', 'under');
  }

  const nationalityKeywords = getNationalitySignals(profile).eventKeywords;
  const recoveryModeActive = extras?.recoveryModeActive === true || profile?.recoveryMode?.active === true;
  const highDiscovery = profile?.sportsFeedPrefs?.discoveryLevel === 'high';

  return {
    interestKeywords: [...interestKeywords],
    interestIds: [...interests],
    categoryWeights,
    teamKeywords,
    nbaTeamKeywords,
    joyKeywords: [...joyKeywords],
    youtuberKeywords: [...youtuberKeywords],
    budgetKeywords,
    nationalityKeywords,
    countryKeywords: [...countryKeywords],
    bookKeywords: [...bookKeywords],
    habitKeywords: [...habitKeywords],
    identityGoalKeywords: [...identityGoalKeywords],
    recoveryModeActive,
    highDiscovery,
  };
}

function buildContextFromInput(input: EventRecommendationInput): EventPersonalizationContext {
  return buildEventPersonalizationContext(input.profile, {
    effectiveJoySources: input.effectiveJoySources,
    habitKeywords: input.habitKeywords,
    recoveryModeActive: input.recoveryModeActive,
  });
}

function isEventRecommendationInput(
  value: UserProfile | EventRecommendationInput | null | undefined,
): value is EventRecommendationInput {
  return value != null && typeof value === 'object' && 'profile' in value;
}

export function resolveEventRecommendationInput(
  profileOrInput: UserProfile | EventRecommendationInput | null | undefined,
): EventRecommendationInput {
  if (isEventRecommendationInput(profileOrInput)) return profileOrInput;
  return { profile: profileOrInput ?? null };
}

function haystack(event: LocalEvent): string {
  const tags = (event.tags ?? []).join(' ');
  const description = event.description ?? '';
  return `${event.title} ${event.venue} ${event.location} ${event.category} ${tags} ${description}`.toLowerCase();
}

export function scoreEventForUser(event: LocalEvent, ctx: EventPersonalizationContext): number {
  let score = 0;
  const text = haystack(event);

  let categoryScore = 0;
  for (const logicalCat of getLogicalCategoryIds(event)) {
    const weight = ctx.categoryWeights.get(logicalCat) ?? 0;
    categoryScore = Math.max(categoryScore, weight * 4);
  }
  score += categoryScore;

  for (const kw of ctx.interestKeywords) {
    if (kw.length >= 3 && text.includes(kw)) score += 5;
  }

  for (const team of ctx.teamKeywords) {
    if (team.length >= 3 && text.includes(team)) score += 8;
  }

  for (const team of ctx.nbaTeamKeywords) {
    if (team.length >= 2 && text.includes(team)) score += 8;
  }

  for (const joy of ctx.joyKeywords) {
    if (joy.length >= 3 && text.includes(joy)) score += 4;
  }

  for (const creator of ctx.youtuberKeywords) {
    if (creator.length >= 3 && text.includes(creator)) score += 4;
  }

  for (const nat of ctx.nationalityKeywords) {
    if (nat.length >= 3 && text.includes(nat)) score += 6;
  }

  for (const country of ctx.countryKeywords) {
    if (country.length >= 3 && text.includes(country)) score += 5;
  }

  for (const book of ctx.bookKeywords) {
    if (book.length >= 4 && text.includes(book)) score += 5;
  }

  for (const habit of ctx.habitKeywords) {
    if (habit.length >= 4 && text.includes(habit)) score += 4;
  }

  for (const goal of ctx.identityGoalKeywords) {
    if (goal.length >= 5 && text.includes(goal)) score += 3;
  }

  const priceLabel = event.price ?? '';
  if (priceLabel === 'Free' || priceLabel.toLowerCase().includes('free')) {
    if (ctx.budgetKeywords.length > 0) score += 5;
    score += 1;
  }

  if (ctx.recoveryModeActive) {
    if (getLogicalCategoryIds(event).some((cat) => RECOVERY_FRIENDLY_CATEGORIES.has(cat))) score += 4;
    if (priceLabel === 'Free' || priceLabel.toLowerCase().includes('free')) score += 3;
    if (event.category === 'nightlife') score -= 4;
  }

  if (ctx.highDiscovery && (event.isHot || event.isFeatured)) score += 2;

  if (event.isLiveNow) score += 6;
  if (event.isHot) score += 3;
  if (event.isFeatured) score += 2;

  const dist = event.distanceKm;
  if (dist != null) {
    if (dist < 5) score += 4;
    else if (dist < 15) score += 2;
    else if (dist > 80) score -= 2;
  }

  return score;
}

function getCalendarFitReason(
  event: LocalEvent,
  calendarEvents: CalendarBusyEvent[],
  now: Date,
): EventRecommendationReason | null {
  if (calendarEvents.length === 0) return null;

  const range = getEventCalendarRange(event);
  if (!range) return null;

  const eventStartMs = range.start.getTime();
  const eventEndMs = range.end.getTime();
  if (eventStartMs <= now.getTime()) return null;

  const busy = eventsToBusyIntervals(calendarEvents, range.start);
  const conflict = busy.some((b) => b.startMs < eventEndMs && b.endMs > eventStartMs);
  if (conflict) return null;

  const daysUntil = getDaysUntilEvent(event);
  const hour = range.start.getHours();
  const weekday = range.start.toLocaleDateString('en-GB', { weekday: 'long' });
  const evening = hour >= 17 && hour <= 22;

  if (daysUntil === 1 && evening) {
    return {
      kind: 'calendar',
      label: `Free evening ${weekday}`,
      priority: 96,
    };
  }
  if (daysUntil === 0 && evening) {
    return {
      kind: 'calendar',
      label: `Free evening ${weekday}`,
      priority: 95,
    };
  }
  if (daysUntil != null && daysUntil >= 0 && daysUntil <= 7 && evening) {
    return { kind: 'calendar', label: `Free evening ${weekday}`, priority: 88 };
  }
  if (daysUntil != null && daysUntil >= 0 && daysUntil <= 7) {
    return { kind: 'calendar', label: `Fits your ${weekday} schedule`, priority: 86 };
  }
  return null;
}

function getTimingReason(
  event: LocalEvent,
  profile: UserProfile | null | undefined,
): EventRecommendationReason | null {
  const chrono = profile?.chronotype ? getChronotypeInfo(profile.chronotype) : undefined;
  const start = parseEventStartDateTime(event);
  if (!start) return null;

  const hour = start.getHours();
  const day = start.getDay();
  const isWeekday = day >= 1 && day <= 5;

  if (isWeekday && hour >= 17 && hour <= 21) {
    return { kind: 'timing', label: 'Perfect after work', priority: 86 };
  }

  if (chrono) {
    const inPeak =
      chrono.peakHours.start <= chrono.peakHours.end
        ? hour >= chrono.peakHours.start && hour < chrono.peakHours.end
        : hour >= chrono.peakHours.start || hour < chrono.peakHours.end;
    if (inPeak) {
      return { kind: 'timing', label: 'Matches your peak energy window', priority: 82 };
    }
  }

  return null;
}

function getSavedCategoryReason(
  event: LocalEvent,
  savedSnapshots: SavedEventSnapshot[],
): EventRecommendationReason | null {
  if (savedSnapshots.length === 0) return null;
  const savedInCategory = savedSnapshots.filter((s) => s.category === event.category);
  if (savedInCategory.length === 0) return null;

  const phrase = EDITORIAL_CATEGORY_PHRASES[event.category] ?? String(event.category).replace(/_/g, ' ');
  return {
    kind: 'saved_category',
    label: `You've saved ${phrase} events before`,
    priority: 91,
  };
}

export function buildEventRecommendationReasons(
  event: LocalEvent,
  input: EventRecommendationInput,
  maxReasons = 2,
): EventRecommendationReason[] {
  const ctx = buildContextFromInput(input);
  const text = haystack(event);
  const reasons: EventRecommendationReason[] = [];
  const now = input.now ?? new Date();
  const savedSnapshots = input.savedSnapshots ?? [];

  for (const team of input.profile?.favoriteTeams ?? []) {
    const teamName = team.name.trim();
    const teamKey = teamName.toLowerCase();
    if (teamKey.length >= 3 && text.includes(teamKey)) {
      reasons.push({
        kind: 'team',
        label: `Because you follow ${teamName}`,
        priority: 100,
      });
      break;
    }
  }

  for (const team of input.profile?.favoriteNBATeams ?? []) {
    const teamName = team.name.trim();
    const teamKey = teamName.toLowerCase();
    const abbr = team.abbreviation.toLowerCase();
    if ((teamKey.length >= 3 && text.includes(teamKey)) || (abbr.length >= 2 && text.includes(abbr))) {
      reasons.push({
        kind: 'nba',
        label: `Because you follow ${teamName}`,
        priority: 99,
      });
      break;
    }
  }

  const calendarReason = getCalendarFitReason(event, input.calendarEvents ?? [], now);
  if (calendarReason) reasons.push(calendarReason);

  const savedCategoryReason = getSavedCategoryReason(event, savedSnapshots);
  if (savedCategoryReason) reasons.push(savedCategoryReason);

  const timingReason = getTimingReason(event, input.profile);
  if (timingReason) reasons.push(timingReason);

  const friendCount = input.friendCountByEventId?.get(event.id) ?? 0;
  if (friendCount > 0) {
    reasons.push({
      kind: 'friends',
      label:
        friendCount === 1 ? '1 friend saved this' : `${friendCount} friends saved this`,
      priority: 85 + Math.min(friendCount, 5),
    });
  }

  for (const nat of ctx.nationalityKeywords) {
    if (nat.length >= 3 && text.includes(nat)) {
      const natName = input.profile?.nationalities?.find(
        (n) => n.name.toLowerCase() === nat || nat.includes(n.name.toLowerCase()),
      )?.name;
      reasons.push({
        kind: 'nationality',
        label: natName ? `You follow ${natName} national teams` : `Matches your ${nat} roots`,
        priority: 78,
      });
      break;
    }
  }

  for (const country of input.profile?.favoriteCountries ?? []) {
    const countryKey = country.name.toLowerCase();
    const leagueHit = country.leagues.find((league) => {
      const leagueKey = league.toLowerCase();
      return leagueKey.length >= 4 && text.includes(leagueKey);
    });
    if (leagueHit) {
      reasons.push({
        kind: 'country',
        label: `You follow ${leagueHit}`,
        priority: 77,
      });
      break;
    }
    if (countryKey.length >= 3 && text.includes(countryKey)) {
      reasons.push({
        kind: 'country',
        label: `Leagues you follow in ${country.name}`,
        priority: 76,
      });
      break;
    }
  }

  for (const book of input.profile?.favoriteBooks ?? []) {
    const titleKey = book.title.trim().toLowerCase();
    const authorKey = book.author.trim().toLowerCase();
    if ((titleKey.length >= 4 && text.includes(titleKey)) || (authorKey.length >= 4 && text.includes(authorKey))) {
      reasons.push({
        kind: 'book',
        label: `For fans of ${book.title}`,
        priority: 75,
      });
      break;
    }
  }

  for (const show of input.effectiveJoySources?.tvShows ?? input.profile?.joySources?.tvShows ?? []) {
    const showKey = show.trim().toLowerCase();
    if (showKey.length >= 4 && text.includes(showKey)) {
      reasons.push({
        kind: 'show',
        label: `You watch ${show.trim()}`,
        priority: 74,
      });
      break;
    }
  }

  for (const creator of ctx.youtuberKeywords) {
    if (creator.length >= 4 && text.includes(creator)) {
      reasons.push({
        kind: 'joy',
        label: `You follow ${creator} on YouTube`,
        priority: 73,
      });
      break;
    }
  }

  for (const joy of ctx.joyKeywords) {
    if (joy.length >= 4 && text.includes(joy)) {
      reasons.push({
        kind: 'joy',
        label: `Similar to ${joy} in your joy picks`,
        priority: 72,
      });
      break;
    }
  }

  for (const habit of ctx.habitKeywords) {
    if (habit.length >= 4 && text.includes(habit)) {
      reasons.push({
        kind: 'habit',
        label: `Fits your ${habit} habit`,
        priority: 71,
      });
      break;
    }
  }

  for (const goal of input.profile?.identityGoals ?? []) {
    const goalKey = goal.trim().toLowerCase();
    if (goalKey.length >= 5 && text.includes(goalKey)) {
      reasons.push({
        kind: 'identity',
        label: `Supports your goal: ${goal.trim()}`,
        priority: 70,
      });
      break;
    }
    for (const word of goalKey.split(/\s+/)) {
      if (word.length >= 6 && text.includes(word)) {
        reasons.push({
          kind: 'identity',
          label: `Supports your goal: ${goal.trim()}`,
          priority: 69,
        });
        break;
      }
    }
    if (reasons.some((r) => r.kind === 'identity')) break;
  }

  if (ctx.recoveryModeActive && RECOVERY_FRIENDLY_CATEGORIES.has(event.category)) {
    reasons.push({
      kind: 'recovery',
      label: 'A gentle pick for recovery mode',
      priority: 67,
    });
  }

  const catWeight = ctx.categoryWeights.get(event.category) ?? 0;
  if (catWeight > 0) {
    const phrase = EDITORIAL_CATEGORY_PHRASES[event.category] ?? String(event.category).replace(/_/g, ' ');
    reasons.push({
      kind: 'interest',
      label: `You enjoy ${phrase}`,
      priority: 80,
    });
  }

  for (const interestId of ctx.interestIds) {
    const onboarding = ONBOARDING_INTEREST_MAP[interestId];
    if (!onboarding) continue;
    const hit = onboarding.keywords.some((kw) => kw.length >= 3 && text.includes(kw));
    if (hit) {
      const label = INTEREST_DISPLAY_NAMES[interestId] ?? interestId;
      reasons.push({
        kind: 'interest',
        label: `Because you're into ${label}`,
        priority: 79,
      });
      break;
    }
  }

  for (const kw of ctx.interestKeywords) {
    if (kw.length >= 4 && text.includes(kw)) {
      reasons.push({
        kind: 'interest',
        label: `Lines up with your ${kw} interest`,
        priority: 78,
      });
      break;
    }
  }

  const dist = event.distanceKm;
  if (dist != null && dist < 8) {
    const mi = kmToMiles(dist);
    reasons.push({
      kind: 'distance',
      label:
        mi < 0.3
          ? 'Only a short walk away'
          : `Only ${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi away`,
      priority: 72,
    });
  }

  const priceLabel = event.price ?? '';
  if (
    (priceLabel === 'Free' || priceLabel.toLowerCase().includes('free')) &&
    ctx.budgetKeywords.length > 0
  ) {
    reasons.push({
      kind: 'budget',
      label: 'Free entry fits your budget',
      priority: 68,
    });
  }

  if (event.isLiveNow) {
    reasons.push({ kind: 'live', label: 'On right now near you', priority: 74 });
  } else if (event.isHot) {
    reasons.push({
      kind: 'trending',
      label: 'Trending with people near you',
      priority: 55,
    });
  }

  if (input.discoveryTab === 'friendsPicks') {
    reasons.push({
      kind: 'friends',
      label: 'Popular with your friends',
      priority: 84,
    });
  } else if (input.discoveryTab === 'near' && dist != null && dist < 15) {
    reasons.push({
      kind: 'distance',
      label: 'Close to where you are',
      priority: 70,
    });
  }

  if (reasons.length === 0) {
    const score = scoreEventForUser(event, ctx);
    if (score > 0) {
      reasons.push({
        kind: 'interest',
        label: 'Picked for your profile and location',
        priority: 40,
      });
    }
  }

  return reasons
    .sort((a, b) => b.priority - a.priority)
    .filter((reason, index, list) => list.findIndex((r) => r.label === reason.label) === index)
    .slice(0, maxReasons);
}

export function getPrimaryEventRecommendationReason(
  event: LocalEvent,
  input: EventRecommendationInput,
): EventRecommendationReason | null {
  return buildEventRecommendationReasons(event, input)[0] ?? null;
}

function isSportRecommendationReason(kind: EventRecommendationReasonKind): boolean {
  return kind === 'team' || kind === 'nba' || kind === 'country' || kind === 'nationality';
}

/** Sport follow reasons only apply to sports events — avoids "Because you follow sport" on music/comedy cards. */
export function isEditorialReasonRelevant(
  reason: EventRecommendationReason,
  event: LocalEvent,
  categoryId: string,
): boolean {
  const logicalCategories = getLogicalCategoryIds(event);
  if (isSportRecommendationReason(reason.kind)) {
    return logicalCategories.includes('sports') && categoryId === 'sports';
  }
  if (reason.kind === 'saved_category') {
    return logicalCategories.includes(categoryId) || getBentoCategoryId(event) === categoryId;
  }
  return true;
}

export function getPrimaryEventRecommendationReasonForCategory(
  event: LocalEvent,
  input: EventRecommendationInput,
  categoryId: string,
): EventRecommendationReason | null {
  const reasons = buildEventRecommendationReasons(event, input, 8);
  return reasons.find((reason) => isEditorialReasonRelevant(reason, event, categoryId)) ?? null;
}

export function getEditorialRowChipLabel(
  categoryId: string,
  event: LocalEvent,
  reason: EventRecommendationReason | null | undefined,
): string {
  const phrase = EDITORIAL_CATEGORY_PHRASES[categoryId] ?? categoryId.replace(/_/g, ' ');

  if (reason && isEditorialReasonRelevant(reason, event, categoryId)) {
    return formatRecommendationChipLabel(reason, event);
  }

  if (categoryId === 'sports') return 'Sports pick';
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function getEditorialRowSecondaryChipLabel(categoryId: string, event: LocalEvent): string {
  if (event.isHot || event.isLiveNow) return 'Trending now';
  if (categoryId === 'sports') return 'Sports pick';
  const phrase = EDITORIAL_CATEGORY_PHRASES[categoryId] ?? categoryId.replace(/_/g, ' ');
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function shortenRecommendationChipLabel(label: string, maxLen = 44): string {
  let text = label.trim();
  text = text.replace(/ friends saved this event$/i, ' friends saved this');
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

/** Specific chip copy from a scored reason — avoids generic “Fits your interests”. */
export function formatRecommendationChipLabel(
  reason: EventRecommendationReason | null | undefined,
  event?: LocalEvent,
): string {
  if (!reason) {
    if (event?.isHot || event?.isLiveNow) return 'Happening now';
    if (event?.subCategory === 'fitness') return 'Fitness pick';
    if (event?.subCategory === 'family') return 'Family pick';
    if (event?.subCategory === 'networking') return 'Networking pick';
    return event?.category === 'sports' ? 'Sports pick' : 'Picked for you';
  }

  if (isSportRecommendationReason(reason.kind) && event?.category !== 'sports') {
    return event?.category === 'sports' ? 'Sports pick' : 'Picked for you';
  }

  return shortenRecommendationChipLabel(reason.label);
}

export function getRecommendationChipLabel(
  event: LocalEvent,
  input: EventRecommendationInput,
  options?: { categoryId?: string },
): string {
  const reason = options?.categoryId
    ? getPrimaryEventRecommendationReasonForCategory(event, input, options.categoryId)
    : getPrimaryEventRecommendationReason(event, input);
  return formatRecommendationChipLabel(reason, event);
}

export function getCompactRecommendationLabel(
  reason: EventRecommendationReason | null | undefined,
  event?: LocalEvent,
): string {
  return formatRecommendationChipLabel(reason, event);
}

/** Overview chip — surfaces habits, sports, calendar, and joy fit on saved gigs. */
export function getOverviewFitChipLabel(
  reason: EventRecommendationReason | null | undefined,
  event?: LocalEvent,
): string {
  if (!reason) return 'On your One Pager';

  switch (reason.kind) {
    case 'habit':
      return 'Fits your habits';
    case 'calendar':
    case 'timing':
      return 'Fits your calendar';
    case 'team':
    case 'nba':
      return 'Matches your teams';
    case 'country':
    case 'nationality':
      return event?.category === 'sports' ? 'Matches your teams' : 'Fits your interests';
    case 'joy':
      return 'Matches your joy';
    case 'show':
      return 'Like your shows';
    case 'friends':
      return 'Friends are going';
    case 'interest':
    case 'saved_category':
      if (event?.subCategory === 'fitness') return 'Fits your fitness habits';
      if (event?.subCategory === 'family') return 'Family-friendly pick';
      if (event?.subCategory === 'networking') return 'Fits your work interests';
      return 'Fits your interests';
    default:
      return getCompactRecommendationLabel(reason, event);
  }
}

export function getFeedCardChipLabel(
  event: LocalEvent,
  reason?: EventRecommendationReason | null,
): string {
  if (reason) return formatRecommendationChipLabel(reason, event);
  if (event.subCategory === 'fitness') return 'Fitness pick';
  if (event.subCategory === 'family') return 'Family pick';
  if (event.subCategory === 'networking') return 'Networking pick';
  if (event.category === 'sports') return 'Sports pick';
  if (event.isHot || event.isLiveNow) return 'Happening now';
  return 'Picked for you';
}

function reasonLabelToClause(label: string): string {
  const trimmed = label.trim();
  if (/^Because you follow /i.test(trimmed)) {
    return `you follow ${trimmed.slice('Because you follow '.length)}`;
  }
  if (/^You follow /i.test(trimmed)) {
    return `you follow ${trimmed.slice('You follow '.length)}`;
  }
  if (/^You enjoy /i.test(trimmed)) {
    return `you like ${trimmed.slice('You enjoy '.length)} events`;
  }
  if (/^Because you're into /i.test(trimmed)) {
    return `you're into ${trimmed.slice("Because you're into ".length)}`;
  }
  if (/^You're free /i.test(trimmed)) {
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }
  if (/^You watch /i.test(trimmed)) {
    return `you watch ${trimmed.slice('You watch '.length)}`;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function explainEventPersonalization(
  event: LocalEvent,
  profile: UserProfile | null | undefined,
  input?: Omit<EventRecommendationInput, 'profile'>,
): string | null {
  const reasons = buildEventRecommendationReasons(event, {
    profile,
    ...input,
  }, 4);
  if (reasons.length === 0) return null;

  const clauses = reasons.slice(0, 4).map((r) => reasonLabelToClause(r.label));
  if (clauses.length === 1) {
    return `Recommended because ${clauses[0]}.`;
  }
  const last = clauses.pop()!;
  return `Recommended because ${clauses.join(', ')}, and ${last}.`;
}

const EDITORIAL_CATEGORY_PHRASES: Record<string, string> = {
  music: 'live music',
  sports: 'sport',
  comedy: 'comedy',
  theatre: 'theatre',
  food: 'food & drink',
  arts: 'arts',
  tech: 'tech',
  nightlife: 'nightlife',
  fitness: 'fitness',
  networking: 'networking',
  family: 'family events',
};

export function rankEventsForYou(
  events: LocalEvent[],
  profileOrInput: UserProfile | EventRecommendationInput | null | undefined,
): LocalEvent[] {
  const input = resolveEventRecommendationInput(profileOrInput);
  const ctx = buildContextFromInput(input);
  return [...events]
    .map((event) => ({ event, score: scoreEventForUser(event, ctx) }))
    .sort((a, b) => b.score - a.score || (a.event.distanceKm ?? 999) - (b.event.distanceKm ?? 999))
    .map(({ event }) => event);
}

export function rankEventsForConciergeFeed(
  events: LocalEvent[],
  profileOrInput: UserProfile | EventRecommendationInput | null | undefined,
  context: EventConciergeContext = 'default',
): LocalEvent[] {
  const ranked = rankEventsForYou(events, profileOrInput);
  return boostEventsForConciergeContext(ranked, context);
}

export function getSimilarEvents(
  current: LocalEvent,
  pool: LocalEvent[],
  profile: UserProfile | null | undefined,
  limit = 8
): LocalEvent[] {
  const others = pool.filter((e) => e.id !== current.id);
  const sameCategory = others.filter((e) => e.category === current.category);
  const candidates = sameCategory.length >= 3 ? sameCategory : others;
  return rankEventsForYou(candidates, profile).slice(0, limit);
}

export function filterFreeOrCheap(events: LocalEvent[]): LocalEvent[] {
  return events.filter((e) => {
    const price = e.price ?? '';
    return (
      price === 'Free' ||
      price.toLowerCase().includes('free') ||
      /^£[1-9]\d?\+?$/.test(price) ||
      /^\$[1-9]\d?\+?$/.test(price)
    );
  });
}

export interface EditorialEventRow {
  id: string;
  title: string;
  categoryId: string;
  events: LocalEvent[];
}

export function buildEditorialEventRows(
  events: LocalEvent[],
  profileOrInput: UserProfile | EventRecommendationInput | null | undefined,
  maxRows = 2,
): EditorialEventRow[] {
  if (events.length === 0) return [];

  const input = resolveEventRecommendationInput(profileOrInput);
  const ctx = buildContextFromInput(input);
  const rankedCategories = [...ctx.categoryWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId]) => categoryId);

  const fallbackCategories = [...new Set(events.map((e) => e.category))];
  const categoryOrder = rankedCategories.length > 0 ? rankedCategories : fallbackCategories;

  const rows: EditorialEventRow[] = [];
  for (const categoryId of categoryOrder) {
    if (rows.length >= maxRows) break;
    const matches = rankEventsForYou(
      events.filter((e) => e.category === categoryId),
      input,
    );
    if (matches.length === 0) continue;

    const phrase = EDITORIAL_CATEGORY_PHRASES[categoryId] ?? categoryId.replace(/_/g, ' ');
    rows.push({
      id: categoryId,
      title: `Because you love ${phrase}`,
      categoryId,
      events: matches.slice(0, 4),
    });
  }

  return rows;
}
