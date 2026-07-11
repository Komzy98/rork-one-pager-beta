import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { isSocialUnavailableError } from '@/utils/friendsService';

export type PartnerReportReason = 'harassment' | 'spam' | 'inappropriate' | 'other';

const REPORT_LABELS: Record<PartnerReportReason, string> = {
  harassment: 'Harassment',
  spam: 'Spam',
  inappropriate: 'Inappropriate content',
  other: 'Other',
};

export function partnerReportLabel(reason: PartnerReportReason): string {
  return REPORT_LABELS[reason];
}

export async function blockPartner(otherUserId: string): Promise<void> {
  if (!supabaseConfigured) throw new Error('Social is not configured');
  const { error } = await supabase.rpc('block_partner', { p_other_user: otherUserId });
  if (error) throw error;
}

export async function reportPartner(
  otherUserId: string,
  reason: PartnerReportReason,
  details?: string,
): Promise<void> {
  if (!supabaseConfigured) throw new Error('Social is not configured');
  const { error } = await supabase.rpc('report_partner', {
    p_other_user: otherUserId,
    p_reason: partnerReportLabel(reason),
    p_details: details?.trim() || null,
  });
  if (error) throw error;
}

/** GDPR-style export of social rows owned by the signed-in user. */
export async function exportSocialData(userId: string): Promise<string> {
  if (!supabaseConfigured) throw new Error('Social is not configured');

  const [
    profileRes,
    friendsRes,
    incomingRes,
    outgoingRes,
    nudgesInRes,
    nudgesOutRes,
    activityRes,
    savesRes,
    rsvpsRes,
    plansRes,
    blocksRes,
    reportsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('friendships').select('*').eq('user_id', userId),
    supabase.from('friend_requests').select('*').eq('to_user', userId),
    supabase.from('friend_requests').select('*').eq('from_user', userId),
    supabase.from('nudges').select('*').eq('to_user', userId),
    supabase.from('nudges').select('*').eq('from_user', userId),
    supabase.from('activity_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('user_event_saves').select('*').eq('user_id', userId),
    supabase.from('plan_rsvps').select('*').eq('user_id', userId),
    supabase.from('shared_plans').select('*').eq('owner_id', userId),
    supabase.from('partner_blocks').select('*').eq('blocker_id', userId),
    supabase.from('partner_reports').select('*').eq('reporter_id', userId),
  ]);

  const firstError =
    profileRes.error ||
    friendsRes.error ||
    incomingRes.error ||
    outgoingRes.error ||
    nudgesInRes.error ||
    nudgesOutRes.error ||
    activityRes.error ||
    savesRes.error ||
    rsvpsRes.error ||
    plansRes.error ||
    blocksRes.error ||
    reportsRes.error;

  if (firstError && !isSocialUnavailableError(firstError)) throw firstError;

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    profile: profileRes.data ?? null,
    friendships: friendsRes.data ?? [],
    incomingFriendRequests: incomingRes.data ?? [],
    outgoingFriendRequests: outgoingRes.data ?? [],
    nudgesReceived: nudgesInRes.data ?? [],
    nudgesSent: nudgesOutRes.data ?? [],
    activityEvents: activityRes.data ?? [],
    eventSaves: savesRes.data ?? [],
    planRsvps: rsvpsRes.data ?? [],
    ownedPlans: plansRes.data ?? [],
    blockedUsers: blocksRes.data ?? [],
    reportsFiled: reportsRes.data ?? [],
  };

  return JSON.stringify(payload, null, 2);
}

/** Remove activity feed posts and partner-visible event saves. */
export async function deleteMyActivityHistory(): Promise<number> {
  if (!supabaseConfigured) return 0;
  const { data, error } = await supabase.rpc('delete_my_activity_history');
  if (error) {
    if (isSocialUnavailableError(error)) return 0;
    throw error;
  }
  return typeof data === 'number' ? data : 0;
}

export async function syncAgeConsentToProfile(
  userId: string,
  birthYear?: number | null,
  parentalSocialConsent?: boolean,
): Promise<void> {
  if (!supabaseConfigured || !userId) return;

  const rpcArgs: { p_birth_year?: number | null; p_parental_social_consent?: boolean | null } = {};
  if (birthYear !== undefined) rpcArgs.p_birth_year = birthYear;
  if (parentalSocialConsent !== undefined) {
    rpcArgs.p_parental_social_consent = parentalSocialConsent;
  }

  const { error: rpcError } = await supabase.rpc('sync_age_consent', rpcArgs);
  if (!rpcError) return;

  const rpcMsg = (rpcError as { message?: string }).message?.toLowerCase() ?? '';
  const rpcMissing =
    (rpcError as { code?: string }).code === '42883' ||
    (rpcError as { code?: string }).code === 'PGRST202' ||
    rpcMsg.includes('could not find the function');

  if (!rpcMissing) throw rpcError;

  const patch: Record<string, number | boolean | string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (birthYear !== undefined) patch.birth_year = birthYear ?? null;
  if (parentalSocialConsent !== undefined) {
    patch.parental_social_consent = parentalSocialConsent;
  }
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error && !isSocialUnavailableError(error)) throw error;
}
