import { supabase, supabaseConfigured } from '@/utils/supabaseClient';

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
  const { data, error } = await supabase.rpc('list_my_habit_shares');
  if (error) {
    if (isMissingHabitShareRpc(error)) return [];
    throw error;
  }
  return ((data as Record<string, string>[] | null) ?? []).map((r) =>
    mapRow({
      owner_id: r.owner_id,
      partner_id: r.partner_id,
      habit_id: r.habit_id,
      habit_name: (r.habit_name as string | null) ?? null,
      created_at: r.created_at,
    }),
  );
}

export async function setPartnerHabitShares(
  partnerId: string,
  habits: HabitInvitePayload[],
): Promise<void> {
  if (!supabaseConfigured) return;
  const habitIds = habits.map((h) => h.habitId);
  const habitNames = habits.map((h) => h.habitName);
  const { error } = await supabase.rpc('set_partner_habit_shares', {
    p_partner_id: partnerId,
    p_habit_ids: habitIds,
    p_habit_names: habitNames,
  });
  if (error) throw error;
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
