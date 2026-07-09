import { useCallback, useState } from 'react';
import { Platform, Share } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { LocalEvent } from '@/types/events';
import type { SocialProfile } from '@/utils/friendsService';
import { getOrCreateEventPlan } from '@/utils/sharedPlansService';

export function useEventInviteFlow() {
  const { supabaseUser, isGuest } = useAuth();
  const { profile } = useUserProfile();
  const { friends, nudge: nudgeFriend, available: friendsAvailable } = useFriends();
  const [inviteEvent, setInviteEvent] = useState<LocalEvent | null>(null);

  const openInvite = useCallback((event: LocalEvent) => {
    setInviteEvent(event);
  }, []);

  const closeInvite = useCallback(() => {
    setInviteEvent(null);
  }, []);

  const handleInviteFriend = useCallback(
    async (friend: SocialProfile, message: string) => {
      if (friendsAvailable !== true) {
        await Share.share({ message });
        return;
      }

      await nudgeFriend(friend.id, message);

      if (inviteEvent && supabaseUser?.id) {
        await getOrCreateEventPlan(supabaseUser.id, inviteEvent);
      }
    },
    [friendsAvailable, inviteEvent, nudgeFriend, supabaseUser?.id],
  );

  const canInvite =
    !isGuest &&
    friendsAvailable === true &&
    friends.length > 0 &&
    Platform.OS !== 'web';

  return {
    inviteEvent,
    openInvite,
    closeInvite,
    handleInviteFriend,
    friends,
    inviterUsername: profile?.username ?? null,
    canInvite,
  };
}
