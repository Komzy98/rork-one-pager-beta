import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

/**
 * Pro entitlement for app themes and future gated features.
 * - Production: `profile.subscriptionTier === 'pro'` (set after IAP / backend sync).
 * - Dev: set `EXPO_PUBLIC_PRO_BYPASS=1` in `.env` to preview Pro themes.
 */
export function useProAccess(): boolean {
  const { profile } = useUserProfile();

  return useMemo(() => {
    if (process.env.EXPO_PUBLIC_PRO_BYPASS === '1') {
      return true;
    }
    return profile?.subscriptionTier === 'pro';
  }, [profile?.subscriptionTier]);
}
