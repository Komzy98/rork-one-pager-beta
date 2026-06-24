import { ALL_NATIONS } from '@/constants/nations';

export type ProfileNationality = { id: string; apiId?: number | null; name?: string };

const CATALOG_API_ID_BY_NATION_ID = new Map(ALL_NATIONS.map((n) => [n.id, n.apiId]));

/** Canonical API-Football team id for a stored nationality (fixes stale/wrong profile apiId). */
export function resolveNationalTeamApiId(nationality: ProfileNationality): number | undefined {
  const fromCatalog = CATALOG_API_ID_BY_NATION_ID.get(nationality.id);
  if (typeof fromCatalog === 'number' && fromCatalog > 0) return fromCatalog;
  const stored = nationality.apiId;
  if (typeof stored === 'number' && stored > 0) return stored;
  return undefined;
}

export function collectNationalTeamApiIds(
  nationalities: readonly ProfileNationality[] | undefined | null,
): number[] {
  if (!nationalities?.length) return [];
  const ids = nationalities
    .map(resolveNationalTeamApiId)
    .filter((id): id is number => id !== undefined);
  return [...new Set(ids)];
}
