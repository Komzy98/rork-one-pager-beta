function dig(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeComparableYounifyTitle(title: string): string {
  return normalizeTitleKey(
    title
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " "),
  );
}

function titleSearchCandidates(rawTitle: string): string[] {
  const base = rawTitle.trim();
  if (base.length < 2) return [];
  const out = new Set<string>();
  const push = (v: string) => {
    const s = v.trim().replace(/\s+/g, " ");
    if (s.length >= 2) out.add(s);
  };
  push(base);
  push(base.replace(/\([^)]*\)/g, " "));
  push(base.replace(/\[[^\]]*\]/g, " "));
  push(base.split(":")[0] ?? base);
  push(base.split(" - ")[0] ?? base);
  push(base.split("|")[0] ?? base);
  push(base.replace(/\b(S\d+|E\d+|Season\s*\d+|Episode\s*\d+)\b/gi, " "));
  return [...out];
}

export function younifyRowTitleCandidates(row: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const pushAll = (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return;
    for (const c of titleSearchCandidates(s)) out.add(c);
  };
  pushAll(row.series);
  pushAll(row.showTitle);
  pushAll(row.programTitle);
  pushAll(row.title);
  pushAll(row.name);
  pushAll(dig(row, ["metadata", "title"]));
  pushAll(dig(row, ["metadata", "series"]));
  return [...out];
}

/** Minimum score to trust a TMDB id lookup when the row has a display title. */
export const YOUNIFY_TMDB_ID_MIN_TITLE_MATCH = 12;

/** How well a TMDB title matches titles on a Younify row (higher = safer to use that id + type). */
export function scoreYounifyRowTitleMatch(
  tmdbTitle: string,
  row: Record<string, unknown>,
): number {
  const cand = normalizeComparableYounifyTitle(tmdbTitle);
  if (!cand) return Number.NEGATIVE_INFINITY;
  const wantedTitles = younifyRowTitleCandidates(row);
  if (wantedTitles.length === 0) return 0;
  let best = Number.NEGATIVE_INFINITY;
  for (const raw of wantedTitles) {
    const wanted = normalizeComparableYounifyTitle(raw);
    if (!wanted) continue;
    if (cand === wanted) best = Math.max(best, 100);
    else if (cand.includes(wanted) || wanted.includes(cand)) best = Math.max(best, 55);
  }
  return best;
}
