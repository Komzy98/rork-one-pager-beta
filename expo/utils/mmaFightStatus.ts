/**
 * Api-Sports MMA fight status helpers — keep backend filters and client transforms aligned.
 * `status.short` is not always uppercase; some payloads use alternative shorts or only `status.long`.
 */

/** Terminal / finished bout codes from api-sports MMA (and common aliases). */
const TERMINAL_MMA_STATUS_SHORT = new Set([
  'FT',
  'AW',
  'FIN',
  'END',
  'KO',
  'TKO',
  'SUB',
  'DEC',
  'DQ',
  'NC',
  'UD',
  'MD',
  'SD',
  'U_DEC',
  'S_DEC',
  'M_DEC',
  'DRAW',
]);

export function normalizeMmaStatusShort(f: any): string | undefined {
  const raw = f?.status?.short ?? f?.status?.code ?? f?.status?.type ?? f?.status;
  if (typeof raw === 'string' && raw.trim()) return raw.trim().toUpperCase();
  return undefined;
}

export function isMmaCompletedStatusShort(short: string | undefined): boolean {
  if (!short) return false;
  return TERMINAL_MMA_STATUS_SHORT.has(short.trim().toUpperCase());
}

export function isMmaLiveStatusShort(short: string | undefined): boolean {
  if (!short) return false;
  const u = short.trim().toUpperCase();
  return u === 'LIVE' || u === 'IN' || u === 'EOR';
}

export function isMmaCompletedFightPayload(f: any): boolean {
  const s = normalizeMmaStatusShort(f);
  if (isMmaCompletedStatusShort(s)) return true;
  const longStr = f?.status?.long;
  if (typeof longStr === 'string') {
    const L = longStr.trim().toLowerCase();
    if (/\b(finished|completed|final)\b/.test(L)) return true;
    if (L.includes('fight ended')) return true;
  }
  return false;
}
