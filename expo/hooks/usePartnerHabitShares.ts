import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { supabaseConfigured } from '@/utils/supabaseClient';
import {
  listMyHabitShares,
  setPartnerHabitShares,
  savePartnerHabitSharesLocally,
  describeSupabaseError,
  sharesForPartner,
  type HabitInvitePayload,
  type PartnerHabitShareRow,
} from '@/utils/partnerHabitShares';

export function usePartnerHabitShares() {
  const { supabaseUser, isGuest } = useAuth();
  const { available } = useFriends();
  const queryClient = useQueryClient();
  const myUserId = supabaseUser?.id;
  const enabled = !!myUserId && supabaseConfigured && !isGuest && available === true;

  const query = useQuery({
    queryKey: ['social', 'habit-shares', myUserId],
    queryFn: () => listMyHabitShares(),
    enabled,
    staleTime: 30_000,
  });

  const refresh = useCallback(() => {
    if (!myUserId) return;
    queryClient.invalidateQueries({ queryKey: ['social', 'habit-shares', myUserId] });
  }, [queryClient, myUserId]);

  const updatePartnerHabits = useCallback(
    async (partnerId: string, habits: HabitInvitePayload[]) => {
      try {
        const result = await setPartnerHabitShares(partnerId, habits);
        await queryClient.refetchQueries({ queryKey: ['social', 'habit-shares', myUserId] });
        return result;
      } catch (e) {
        const msg = describeSupabaseError(e).toLowerCase();
        if (
          myUserId &&
          !msg.includes('not signed in') &&
          !msg.includes('sign in to share')
        ) {
          await savePartnerHabitSharesLocally(myUserId, partnerId, habits);
          await queryClient.refetchQueries({ queryKey: ['social', 'habit-shares', myUserId] });
          return { usedLocalFallback: true };
        }
        throw e;
      }
    },
    [queryClient, myUserId],
  );

  const sharesFor = useCallback(
    (partnerId: string): PartnerHabitShareRow[] => {
      if (!myUserId) return [];
      return sharesForPartner(query.data ?? [], myUserId, partnerId);
    },
    [query.data, myUserId],
  );

  return {
    shares: query.data ?? [],
    enforced: query.isSuccess,
    isLoading: query.isLoading,
    refresh,
    updatePartnerHabits,
    sharesFor,
  };
}
