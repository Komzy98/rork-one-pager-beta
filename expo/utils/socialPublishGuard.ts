import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { activityVisibilityStorageKey } from '@/utils/socialActivityPublish';
import { unifiedStorage } from '@/utils/unifiedStorage';

/**
 * Returns false when the user has set activity visibility to private.
 * Checks local cache first, then the server profile row.
 */
export async function canWriteSocialActivity(userId: string): Promise<boolean> {
  if (!supabaseConfigured || !userId) return false;

  try {
    const cached = await unifiedStorage.getItem(activityVisibilityStorageKey(userId));
    if (cached === 'private') return false;
    if (cached === 'friends' || cached === 'public') return true;
  } catch {
    // fall through to server
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('activity_visibility')
      .eq('id', userId)
      .maybeSingle();
    if (error) return false;
    return (data as { activity_visibility?: string } | null)?.activity_visibility !== 'private';
  } catch {
    return false;
  }
}
