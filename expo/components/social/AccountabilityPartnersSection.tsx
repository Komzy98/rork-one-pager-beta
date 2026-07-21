import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useActivity } from '@/hooks/useActivity';
import { useSocialUnread } from '@/hooks/useSocialUnread';
import { usePartnerActivityActions } from '@/hooks/usePartnerActivityActions';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { PartnerInviteEmptyCard } from '@/components/social/PartnerInviteEmptyCard';
import { PartnerListSyncCard } from '@/components/social/PartnerListSyncCard';
import { AccountabilityCircleCard } from '@/components/social/AccountabilityCircleCard';
import { AccountabilityInboxCard } from '@/components/social/AccountabilityInboxCard';
import { PartnerActivityFeed } from '@/components/social/PartnerActivityFeed';
import {
  confirmBeforeFirstPartner,
  isPartnerInviteOverviewDismissed,
  markPartnerInviteOverviewDismissed,
} from '@/utils/partnerPrivacy';
import {
  derivePartnersAtRisk,
  getCircleProgress,
  getHabitGapMotivation,
} from '@/utils/socialAccountability';
import type { ActivityRowActionKind } from '@/utils/socialAccountability';

export function AccountabilityPartnersSection() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const partnerActivity = useActivity();
  const { stats } = useTodayHabits();

  const {
    available: friendsAvailable,
    friends: partnerList,
    friendshipCount,
    myProfile,
    incomingRequests,
    unreadNudges,
    socialAlertCount,
    isLoading: friendsLoading,
    isRefreshing: friendsRefreshing,
    hasFriendsError,
    refresh: refreshFriends,
    accept: acceptPartnerRequest,
    nudge: nudgePartner,
    markAllNudgesRead,
  } = useFriends();

  const {
    unreadFeedCount,
    unreadCheerCount,
    lastSeenAt,
    markSocialSeen,
  } = useSocialUnread(user?.id, partnerActivity.feed);

  const totalSocialAlertCount = socialAlertCount + unreadFeedCount;

  const partnerActions = usePartnerActivityActions({
    onCheer: (eventId, on) => partnerActivity.cheer(eventId, on),
  });

  const accountabilityCircle = useMemo(
    () => getCircleProgress(partnerList, partnerActivity.activeTodayCount),
    [partnerList, partnerActivity.activeTodayCount],
  );

  const partnersAtRisk = useMemo(
    () => derivePartnersAtRisk(partnerList, partnerActivity.activeTodayCount, partnerActivity.feed),
    [partnerList, partnerActivity.activeTodayCount, partnerActivity.feed],
  );

  const habitGapMotivation = useMemo(
    () =>
      getHabitGapMotivation(
        stats.completedHabits,
        stats.totalHabits,
        partnerActivity.feed,
      ),
    [stats.completedHabits, stats.totalHabits, partnerActivity.feed],
  );

  const [partnerInviteDismissed, setPartnerInviteDismissed] = useState(true);

  useEffect(() => {
    void isPartnerInviteOverviewDismissed(userId).then(setPartnerInviteDismissed);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (friendsAvailable === true) {
        refreshFriends();
        partnerActivity.refresh();
      }
      return () => {
        void markSocialSeen();
      };
    }, [friendsAvailable, refreshFriends, partnerActivity.refresh, markSocialSeen]),
  );

  const handlePartnerRowAction = useCallback(
    (event: import('@/utils/activityService').ActivityEvent, kind: ActivityRowActionKind) => {
      void partnerActions.runAction(event, kind);
    },
    [partnerActions],
  );

  const handleAcceptPartnerRequest = useCallback(
    async (requestId: string) => {
      if (myProfile?.id) {
        const ok = await confirmBeforeFirstPartner(myProfile.id);
        if (!ok) return;
      }
      try {
        await acceptPartnerRequest(requestId);
      } catch (e) {
        Alert.alert('Could not accept', (e as Error)?.message || 'Please try again.');
      }
    },
    [acceptPartnerRequest, myProfile?.id],
  );

  const handleDismissPartnerInvite = useCallback(() => {
    setPartnerInviteDismissed(true);
    void markPartnerInviteOverviewDismissed(userId);
  }, [userId]);

  const cardColors = {
    text: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    card: colors.card,
    border: colors.border,
    primary: colors.primary,
    surfaceSecondary: colors.surfaceSecondary,
  };

  const manageSubtitle =
    partnerList.length > 0
      ? `${partnerList.length} partner${partnerList.length === 1 ? '' : 's'}`
      : 'Add friends to keep each other on track';

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Accountability Partners</Text>

      <TouchableOpacity
        style={[styles.manageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push('/friends' as any)}
        activeOpacity={0.7}
      >
        <View style={[styles.manageIconBg, { backgroundColor: '#FF6A3D15' }]}>
          <Users size={18} color="#FF6A3D" />
        </View>
        <View style={styles.manageContent}>
          <Text style={[styles.manageTitle, { color: colors.text }]}>Manage partners</Text>
          <Text style={[styles.manageSubtitle, { color: colors.textTertiary }]}>{manageSubtitle}</Text>
        </View>
        {totalSocialAlertCount > 0 ? (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{totalSocialAlertCount}</Text>
          </View>
        ) : null}
        <ChevronRight size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.cards}>
        {friendsAvailable === true &&
        !friendsLoading &&
        !hasFriendsError &&
        partnerList.length === 0 &&
        friendshipCount === 0 &&
        !partnerInviteDismissed ? (
          <PartnerInviteEmptyCard
            username={myProfile?.username}
            colors={cardColors}
            onAddPartner={() => router.push('/friends' as any)}
            onDismiss={handleDismissPartnerInvite}
          />
        ) : null}

        {(friendsAvailable === true && !friendsLoading && partnerList.length === 0 && friendshipCount > 0) ||
        (friendsAvailable === true && hasFriendsError) ? (
          <PartnerListSyncCard
            partnerCount={friendshipCount}
            isRefreshing={friendsRefreshing}
            colors={cardColors}
            onRefresh={() => refreshFriends()}
            onOpenPartners={() => router.push('/friends' as any)}
          />
        ) : null}

        {friendsAvailable === true && partnerList.length > 0 ? (
          <AccountabilityCircleCard
            circle={accountabilityCircle}
            partners={partnerList}
            partnersAtRisk={partnersAtRisk}
            habitGap={habitGapMotivation}
            alertCount={totalSocialAlertCount}
            onNudge={(partnerUserId) => void nudgePartner(partnerUserId)}
            onOpenHabits={() => router.push('/(tabs)/tasks' as any)}
            onOpenPartners={() => router.push('/friends' as any)}
            colors={cardColors}
          />
        ) : null}

        {friendsAvailable === true && totalSocialAlertCount > 0 ? (
          <AccountabilityInboxCard
            incomingRequests={incomingRequests}
            unreadNudges={unreadNudges}
            partnerFeed={partnerActivity.feed}
            lastSeenAt={lastSeenAt}
            unreadCheerCount={unreadCheerCount}
            currentUserId={user?.id}
            onAccept={(id) => void handleAcceptPartnerRequest(id)}
            onNudgeBack={(partnerUserId) => {
              void (async () => {
                await nudgePartner(partnerUserId, 'You got this — glad we’re showing up together 💪');
                await markAllNudgesRead();
              })();
            }}
            onOpenTasks={() => router.push('/(tabs)/tasks' as any)}
            onPartnerActivityAction={handlePartnerRowAction}
            onOpenPartners={() => {
              void markSocialSeen();
              router.push('/friends' as any);
            }}
            colors={cardColors}
          />
        ) : null}

        {partnerActivity.available === true && partnerActivity.feed.length > 0 ? (
          <PartnerActivityFeed
            feed={partnerActivity.feed}
            activeTodayCount={partnerActivity.activeTodayCount}
            presenceLabel={partnerActivity.presenceLabel}
            currentUserId={user?.id}
            alertCount={totalSocialAlertCount}
            actionOriented
            onRowAction={handlePartnerRowAction}
            colors={cardColors}
            onCheer={(eventId, on) => void partnerActivity.cheer(eventId, on)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  manageIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  manageContent: {
    flex: 1,
    minWidth: 0,
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  manageSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  alertBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 6,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cards: {
    gap: 8,
  },
});
