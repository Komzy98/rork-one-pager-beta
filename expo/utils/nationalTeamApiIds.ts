import { ALL_NATIONS } from '@/constants/nations';

export type ProfileNationality = { id: string; apiId?: number | null; name?: string };

const CATALOG_API_ID_BY_NATION_ID = new Map(ALL_NATIONS.map((n) => [n.id, n.apiId]));

const API_ID_COUNTS = ALL_NATIONS.reduce((counts, nation) => {
  counts.set(nation.apiId, (counts.get(nation.apiId) ?? 0) + 1);
  return counts;
}, new Map<number, number>());

/**
 * IDs duplicated across different countries are not trustworthy enough to query directly.
 * Example: the catalogue previously mapped both Netherlands and Nigeria to 1118.
 * The backend can resolve national teams by name instead.
 */
export const AMBIGUOUS_NATIONAL_TEAM_API_IDS = new Set(
  [...API_ID_COUNTS.entries()]
    .filter(([, count]) => count > 1)
    .map(([apiId]) => apiId),
);

function isUsableApiId(apiId: number | null | undefined): apiId is number {
  return (
    typeof apiId === 'number'
    && apiId > 0
    && !AMBIGUOUS_NATIONAL_TEAM_API_IDS.has(apiId)
  );
}

/**
 * Best-effort local ID. We deliberately refuse ambiguous catalogue/stored IDs;
 * FootballBundleProvider also sends the country name so the backend can resolve
 * the authoritative API-Football team ID at runtime.
 */
export function resolveNationalTeamApiId(nationality: ProfileNationality): number | undefined {
  const stored = nationality.apiId;
  if (isUsableApiId(stored)) return stored;

  const fromCatalog = CATALOG_API_ID_BY_NATION_ID.get(nationality.id);
  if (isUsableApiId(fromCatalog)) return fromCatalog;

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

export function collectNationalTeamNames(
  nationalities: readonly ProfileNationality[] | undefined | null,
): string[] {
  if (!nationalities?.length) return [];
  return [
    ...new Set(
      nationalities
        .map((nationality) => nationality.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];
}
