/** Substrings in club names that must not count as a national-team country match. */
const TEAM_NAME_COUNTRY_BLOCKERS: Readonly<Record<string, readonly RegExp[]>> = {
  england: [/\bnew england\b/i],
  ireland: [/\bnorthern ireland\b/i],
  guinea: [/\bpapua new guinea\b/i, /\bequatorial guinea\b/i],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when a fixture team name represents a followed country (national team),
 * not a club whose name merely contains a country substring (e.g. New England FC ≠ England).
 */
export function teamNameMatchesNationalInterest(
  teamName: string,
  countryNameLower: string,
): boolean {
  const team = teamName.toLowerCase().trim();
  const country = countryNameLower.toLowerCase().trim();
  if (!team || !country) return false;

  const blockers = TEAM_NAME_COUNTRY_BLOCKERS[country];
  if (blockers?.some((re) => re.test(team))) return false;

  if (team === country) return true;
  if (team.startsWith(`${country} `)) return true;

  return new RegExp(`\\b${escapeRegExp(country)}\\b`, 'i').test(team);
}
