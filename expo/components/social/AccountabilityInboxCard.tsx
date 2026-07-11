import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronRight, Hand, PartyPopper, UserPlus, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { ActivityEvent } from '@/utils/activityService';
import type { FriendNudge, IncomingRequest } from '@/utils/friendsService';

interface AccountabilityInboxCardProps {
  incomingRequests: IncomingRequest[];
  unreadNudges: FriendNudge[];
  unreadFeedCount: number;
  unreadCheerCount: number;
  onAccept: (requestId: string) => void | Promise<void>;
  onNudgeBack: (userId: string) => void | Promise<void>;
  onCheerLatest?: () => void;
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    card: string;
    border: string;
    primary: string;
    surfaceSecondary?: string;
  };
}

export function AccountabilityInboxCard({
  incomingRequests,
  unreadNudges,
  unreadFeedCount,
  unreadCheerCount,
  onAccept,
  onNudgeBack,
  onCheerLatest,
  colors,
}: AccountabilityInboxCardProps) {
  const router = useRouter();

  const alertCount =
    incomingRequests.length + unreadNudges.length + unreadFeedCount + unreadCheerCount;

  const feedSummary = useMemo(() => {
    const parts: string[] = [];
    if (unreadFeedCount > 0) {
      parts.push(
        `${unreadFeedCount} new partner update${unreadFeedCount === 1 ? '' : 's'}`,
      );
    }
    if (unreadCheerCount > 0) {
      parts.push(`${unreadCheerCount} cheer${unreadCheerCount === 1 ? '' : 's'} on your progress`);
    }
    return parts.join(' · ');
  }, [unreadFeedCount, unreadCheerCount]);

  if (alertCount <= 0) return null;

  const firstRequest = incomingRequests[0];
  const firstNudge = unreadNudges[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Users size={16} color={colors.primary} strokeWidth={2.4} />
          <Text style={[styles.title, { color: colors.text }]}>Partner inbox</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{alertCount}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/friends' as any)} hitSlop={8}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      </View>

      {!!feedSummary && (
        <Text style={[styles.summary, { color: colors.textSecondary }]}>{feedSummary}</Text>
      )}

      {firstRequest ? (
        <View style={[styles.row, { backgroundColor: colors.surfaceSecondary ?? colors.border + '33' }]}>
          <UserPlus size={16} color={colors.primary} />
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {firstRequest.from.displayName || firstRequest.from.username}
            </Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>Wants to be your partner</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => void onAccept(firstRequest.id)}
          >
            <Check size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {firstNudge ? (
        <View style={[styles.row, { backgroundColor: colors.surfaceSecondary ?? colors.border + '33' }]}>
          <Hand size={16} color={colors.primary} />
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {firstNudge.from?.displayName || firstNudge.from?.username || 'A partner'}
            </Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={2}>
              {firstNudge.message?.trim() || 'Nudged you to keep your streak going'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: colors.primary }]}
            onPress={() => firstNudge.fromUserId && void onNudgeBack(firstNudge.fromUserId)}
          >
            <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>Nudge back</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {unreadCheerCount > 0 && onCheerLatest ? (
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.surfaceSecondary ?? colors.border + '33' }]}
          onPress={onCheerLatest}
        >
          <PartyPopper size={16} color="#F59E0B" />
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {unreadCheerCount} new cheer{unreadCheerCount === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>Friends are hyping your progress</Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  countPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
