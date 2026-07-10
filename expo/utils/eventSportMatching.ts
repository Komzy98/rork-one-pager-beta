import type { LocalEvent } from '@/types/events';
import type { UserProfile } from '@/types/habit';

export type EventSportDiscipline = 'basketball' | 'baseball' | 'football' | 'other';

const BASKETBALL_PATTERN =
  /\b(nba|basketball|wnba|celtics|lakers|cavaliers|warriors|knicks|bucks|playoffs|hoops)\b/i;
const BASEBALL_PATTERN =
  /\b(mlb|baseball|innings|home run|grand slam|pitcher|rockies|yankees|dodgers|giants|athletics|mariners)\b/i;
const FOOTBALL_PATTERN =
  /\b(premier league|champions league|la liga|serie a|bundesliga|mls|football|soccer|fc\b|afc\b|fixture)\b/i;

function normalizeHaystack(event: Pick<LocalEvent, 'title' | 'venue' | 'location' | 'category' | 'tags' | 'description'>): string {
  const tags = (event.tags ?? []).join(' ');
  const description = event.description ?? '';
  return `${event.title} ${event.venue} ${event.location} ${event.category} ${tags} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token match — avoids CLE inside "oracle", GS inside unrelated words, etc. */
export function includesSportToken(text: string, token: string): boolean {
  const normalized = token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^| )${escaped}(?: |$)`, 'i');
  return pattern.test(text);
}

export function detectEventSportDiscipline(
  event: Pick<LocalEvent, 'title' | 'venue' | 'location' | 'category' | 'tags' | 'description'>,
): EventSportDiscipline {
  const text = normalizeHaystack(event);
  if (BASKETBALL_PATTERN.test(text)) return 'basketball';
  if (BASEBALL_PATTERN.test(text)) return 'baseball';
  if (FOOTBALL_PATTERN.test(text)) return 'football';
  return 'other';
}

export function profileFollowsBasketball(profile: UserProfile | null | undefined): boolean {
  return (profile?.favoriteNBATeams?.length ?? 0) > 0 || (profile?.interests ?? []).includes('nba');
}

export function profileFollowsFootball(profile: UserProfile | null | undefined): boolean {
  return (profile?.favoriteTeams?.length ?? 0) > 0 || (profile?.interests ?? []).includes('football');
}

export function sportDisciplineMatchesProfile(
  discipline: EventSportDiscipline,
  profile: UserProfile | null | undefined,
): boolean {
  if (discipline === 'basketball') return profileFollowsBasketball(profile);
  if (discipline === 'football') return profileFollowsFootball(profile);
  if (discipline === 'baseball') {
    return (profile?.interests ?? []).some((interest) => /baseball|mlb/i.test(interest));
  }
  return profileFollowsBasketball(profile) || profileFollowsFootball(profile);
}

export function eventMatchesNbaFollow(
  event: Pick<LocalEvent, 'title' | 'venue' | 'location' | 'category' | 'tags' | 'description'>,
  team: { name: string; abbreviation: string },
): boolean {
  const text = normalizeHaystack(event);
  const discipline = detectEventSportDiscipline(event);
  if (discipline === 'baseball' || discipline === 'football') return false;

  const teamName = team.name.trim();
  if (teamName.length >= 3 && includesSportToken(text, teamName)) return true;

  const abbr = team.abbreviation.trim();
  if (abbr.length >= 2 && includesSportToken(text, abbr)) {
    return discipline === 'basketball' || discipline === 'other';
  }

  return false;
}

export function eventMatchesFootballFollow(
  event: Pick<LocalEvent, 'title' | 'venue' | 'location' | 'category' | 'tags' | 'description'>,
  team: { name: string; shortName?: string },
): boolean {
  const text = normalizeHaystack(event);
  const discipline = detectEventSportDiscipline(event);
  if (discipline === 'baseball' || discipline === 'basketball') return false;

  const teamName = team.name.trim();
  if (teamName.length >= 3 && includesSportToken(text, teamName)) return true;

  const shortName = team.shortName?.trim();
  if (shortName && shortName.length >= 3 && includesSportToken(text, shortName)) return true;

  return false;
}

export function shouldDeprioritizeSportEvent(
  event: Pick<LocalEvent, 'title' | 'venue' | 'location' | 'category' | 'tags' | 'description'>,
  profile: UserProfile | null | undefined,
): boolean {
  if (event.category !== 'sports') return false;
  const discipline = detectEventSportDiscipline(event);
  return !sportDisciplineMatchesProfile(discipline, profile);
}
