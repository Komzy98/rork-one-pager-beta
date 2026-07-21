import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { unifiedStorage } from '@/utils/unifiedStorage';

export interface PartnerHabitShareRow {
  ownerId: string;
  partnerId: string;
  habitId: string;
  habitName: string | null;
  createdAt: string;
}

export interface HabitInvitePayload {
  habitId: string;
  habitName: string;
}

function mapRow(row: {
  owner_id: string;
  partner_id: string;
  habit_id: string;
  habit_name: string | null;
  created_at: string;
}): PartnerHabitShareRow {
  return {
    ownerId: row.owner_id,
    partnerId: row.partner_id,
    habitId: row.habit_id,
    habitName: row.habit_name,
    createdAt: row.created_at,
  };
}

function localSharesKey(userId: string): string {
  return `partner_habit_shares_v1_${userId}`;
}

async function readLocalShares(ownerId: string): Promise<PartnerHabitShareRow[]> {
  try {
    const raw = await unifiedStorage.getItem(localSharesKey(ownerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PartnerHabitShareRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalSharesForPartner(
  ownerId: string,
  partnerId: string,
  habits: HabitInvitePayload[],
): Promise<void> {
  const existing = await readLocalShares(ownerId);
  const kept = existing.filter((r) => !(r.ownerId === ownerId && r.partnerId === partnerId));
  const now = new Date().toISOString();
  const added: PartnerHabitShareRow[] = habits.map((h) => ({
    ownerId,
    partnerId,
    habitId: h.habitId,
    habitName: h.habitName,
    createdAt: now,
  }));
  await unifiedStorage.setItem(localSharesKey(ownerId), JSON.stringify([...kept, ...added]));
}

/** Exported for hook last-resort persistence when Supabase writes fail. */
export async function savePartnerHabitSharesLocally(
  ownerId: string,
  partnerId: string,
  habits: HabitInvitePayload[],
): Promise<void> {
  await writeLocalSharesForPartner(ownerId, partnerId, habits);
}

export function describeSupabaseError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const e = error as { message?: string; details?: string; hint?: string; code?: string } | null;
  if (!e) return '';
  return [e.message, e.details, e.hint, e.code ? `[${e.code}]` : '']
    .filter((p) => p && String(p).trim())
    .join(' ')
    .trim();
}

export function formatPartnerHabitShareError(error: unknown): string {
  if (isMissingHabitShareRpc(error)) {
    return 'Saved on this device. Ask your admin to apply Supabase migration 015 for cross-device partner sharing.';
  }
  const msg = describeSupabaseError(error);
  const lower = msg.toLowerCase();
  if (lower.includes('not partners')) {
    return 'You must be connected as accountability partners first. Open Accountability Partners and confirm the friendship is active.';
  }
  if (lower.includes('social not available')) {
    return 'Complete Profile → Your data (birth year) to share habits with partners.';
  }
  if (lower.includes('not authenticated')) {
    return 'Please sign in again, then retry.';
  }
  if (lower.includes('blocked')) {
    return 'This partner is blocked. Unblock them in Accountability Partners to share.';
  }
  if (lower.includes('invalid partner')) {
    return 'Could not find that partner. Refresh Accountability Partners and try again.';
  }
  if (lower.includes('partner_habit_shares') && lower.includes('does not exist')) {
    return 'Apply Supabase migration 015_partner_habit_shares.sql on your project, then try again.';
  }
  if (lower.includes('row-level security') || lower.includes('42501')) {
    return 'Permission denied saving partner access. Apply migration 015 and confirm you are signed in.';
  }
  return msg || 'Something went wrong. Pull to refresh Accountability Partners, then try again.';
}

function isMissingTableOrRpc(error: unknown): boolean {
  if (isMissingHabitShareRpc(error)) return true;
  const msg = describeSupabaseError(error).toLowerCase();
  return msg.includes('does not exist') || msg.includes('42p01') || msg.includes('pgrst205');
}

function isMissingHabitShareRpc(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  const msg = (e.message || '').toLowerCase();
  return (
    e.code === '42883' ||
    e.code === 'PGRST202' ||
    msg.includes('list_my_habit_shares') ||
    msg.includes('set_partner_habit_shares') ||
    msg.includes('partner_habit_shares')
  );
}

export async function isPartnerHabitEnforcementActive(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { error } = await supabase.rpc('list_my_habit_shares');
  if (!error) return true;
  return !isMissingHabitShareRpc(error);
}

export async function listMyHabitShares(): Promise<PartnerHabitShareRow[]> {
  if (!supabaseConfigured) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;

  const { data, error } = await supabase.rpc('list_my_habit_shares');
  if (error) {
    if (isMissingTableOrRpc(error)) {
      if (!uid) return [];
      return readLocalShares(uid);
    }
    // Fall through to table read
  } else {
    const serverRows = ((data as Record<string, string>[] | null) ?? []).map((r) =>
      mapRow({
        owner_id: r.owner_id,
        partner_id: r.partner_id,
        habit_id: r.habit_id,
        habit_name: (r.habit_name as string | null) ?? null,
        created_at: r.created_at,
      }),
    );
    if (serverRows.length > 0) return serverRows;
  }

  if (uid) {
    const { data: tableRows, error: tableError } = await supabase
      .from('partner_habit_shares')
      .select('owner_id, partner_id, habit_id, habit_name, created_at')
      .or(`owner_id.eq.${uid},partner_id.eq.${uid}`);
    if (!tableError && tableRows?.length) {
      return tableRows.map((r) =>
        mapRow({
          owner_id: r.owner_id as string,
          partner_id: r.partner_id as string,
          habit_id: r.habit_id as string,
          habit_name: (r.habit_name as string | null) ?? null,
          created_at: r.created_at as string,
        }),
      );
    }
    const local = await readLocalShares(uid);
    if (local.length > 0) return local;
  }

  if (error && !isMissingTableOrRpc(error)) throw error;
  return [];
}

async function repairFriendshipLinksSafe(): Promise<void> {
  try {
    const { repairFriendshipLinks } = await import('@/utils/friendsService');
    await repairFriendshipLinks();
  } catch {
    // Non-fatal — RPC may still succeed
  }
}

async function setPartnerHabitSharesViaTable(
  ownerId: string,
  partnerId: string,
  habits: HabitInvitePayload[],
): Promise<{ error: unknown | null }> {
  const { error: delError } = await supabase
    .from('partner_habit_shares')
    .delete()
    .eq('owner_id', ownerId)
    .eq('partner_id', partnerId);
  if (delError) return { error: delError };

  if (habits.length === 0) return { error: null };

  const rows = habits.map((h) => ({
    owner_id: ownerId,
    partner_id: partnerId,
    habit_id: h.habitId,
    habit_name: h.habitName,
  }));
  const { error: insError } = await supabase.from('partner_habit_shares').insert(rows);
  return { error: insError };
}

async function rpcSetPartnerHabitShares(
  partnerId: string,
  habitIds: string[],
  habitNames: string[],
): Promise<{ error: unknown | null }> {
  const { error } = await supabase.rpc('set_partner_habit_shares', {
    p_partner_id: partnerId,
    p_habit_ids: habitIds,
    p_habit_names: habitNames,
  });
  return { error };
}

export async function setPartnerHabitShares(
  partnerId: string,
  habits: HabitInvitePayload[],
): Promise<{ usedLocalFallback: boolean }> {
  if (!supabaseConfigured) {
    throw new Error('Sign in to share habits with partners.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');
  const ownerId = user.id;

  await repairFriendshipLinksSafe();

  const habitIds = habits.map((h) => h.habitId);
  const habitNames = habits.map((h) => h.habitName);

  let { error } = await rpcSetPartnerHabitShares(partnerId, habitIds, habitNames);

  if (error) {
    const msg = describeSupabaseError(error).toLowerCase();
    if (msg.includes('not partners')) {
      await repairFriendshipLinksSafe();
      ({ error } = await rpcSetPartnerHabitShares(partnerId, habitIds, habitNames));
    }
  }

  if (!error) {
    await writeLocalSharesForPartner(ownerId, partnerId, habits);
    return { usedLocalFallback: false };
  }

  if (isMissingTableOrRpc(error)) {
    await writeLocalSharesForPartner(ownerId, partnerId, habits);
    return { usedLocalFallback: true };
  }

  const tableResult = await setPartnerHabitSharesViaTable(ownerId, partnerId, habits);
  if (!tableResult.error) {
    await writeLocalSharesForPartner(ownerId, partnerId, habits);
    return { usedLocalFallback: false };
  }

  if (isMissingTableOrRpc(tableResult.error)) {
    await writeLocalSharesForPartner(ownerId, partnerId, habits);
    return { usedLocalFallback: true };
  }

  if (__DEV__) {
    console.warn('[partnerHabitShares] RPC error:', describeSupabaseError(error));
    console.warn('[partnerHabitShares] Table error:', describeSupabaseError(tableResult.error));
  }

  throw tableResult.error ?? error;
}

/** Habits I share with a specific partner (I am owner). */
export function sharesForPartner(
  rows: PartnerHabitShareRow[],
  myUserId: string,
  partnerId: string,
): PartnerHabitShareRow[] {
  return rows.filter((r) => r.ownerId === myUserId && r.partnerId === partnerId);
}

/** Habits a partner shares with me (I am partner / viewer). */
export function sharesFromOwner(
  rows: PartnerHabitShareRow[],
  ownerId: string,
  myUserId: string,
): PartnerHabitShareRow[] {
  return rows.filter((r) => r.ownerId === ownerId && r.partnerId === myUserId);
}

/** True if this habit is shared with at least one partner (publish to social feed). */
export function isHabitSharedWithAnyPartner(
  rows: PartnerHabitShareRow[],
  myUserId: string,
  habitId: string,
): boolean {
  return rows.some((r) => r.ownerId === myUserId && r.habitId === habitId);
}

/** Filter partner activity: habit events only if habit was shared with viewer. */
export function isPartnerHabitActivityVisible(
  rows: PartnerHabitShareRow[],
  viewerId: string,
  authorId: string,
  metadata: Record<string, unknown>,
  activityType: string,
): boolean {
  if (authorId === viewerId) return true;
  const habitTypes = new Set(['workout', 'published_habit']);
  if (!habitTypes.has(activityType)) return true;

  const shared = sharesFromOwner(rows, authorId, viewerId);
  if (shared.length === 0) return false;

  const habitId = typeof metadata.habitId === 'string' ? metadata.habitId : null;
  if (!habitId) {
    // Generic habit activity without id — only if they shared at least one habit
    return shared.length > 0;
  }
  return shared.some((s) => s.habitId === habitId);
}
