import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Hand, PartyPopper, Sparkles, UserPlus, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { ActivityEvent } from '@/utils/activityService';
import type { FriendNudge, IncomingRequest } from '@/utils/friendsService';
import type { ActivityRowActionKind } from '@/utils/socialAccountability';
import {
  buildPartnerInboxItems,
  countPartnerInboxTotal,
  type PartnerInboxAction,
  type PartnerInboxItem,
} from '@/utils/partnerInbox';

interface AccountabilityInboxCardProps {
  incomingRequests: IncomingRequest[];
  unreadNudges: FriendNudge[];
  partnerFeed: ActivityEvent[];
  lastSeenAt: string | null;
  unreadCheerCount: number;
  currentUserId?: string;
  onAccept: (requestId: string) => void | Promise<void>;
  onNudgeBack: (userId: string) => void | Promise<void>;
  onOpenTasks?: () => void;
  onPartnerActivityAction?: (event: ActivityEvent, kind: ActivityRowActionKind) => void;
  onOpenPartners?: () => void;
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

function rowIcon(kind: PartnerInboxItem['kind']) {
  switch (kind) {
    case 'partner_request':
      return UserPlus;
    case 'nudge':
      return Hand;
    case 'cheers_received':
      return PartyPopper;
    default:
      return Sparkles;
  }
}

function rowIconColor(kind: PartnerInboxItem['kind'], primary: string): string {
  if (kind === 'cheers_received') return '#F59E0B';
  return primary;
}

export function AccountabilityInboxCard({
  incomingRequests,
  unreadNudges,
  partnerFeed,
  lastSeenAt,
  unreadCheerCount,
  currentUserId,
  onAccept,
  onNudgeBack,
  onOpenTasks,
  onPartnerActivityAction,
  onOpenPartners,
  colors,
}: AccountabilityInboxCardProps) {
  const router = useRouter();

  const totalCount = useMemo(
    () =>
      countPartnerInboxTotal({
        incomingRequests,
        unreadNudges,
        feed: partnerFeed,
        lastSeenAt,
        currentUserId,
        unreadCheerCount,
      }),
    [incomingRequests, unreadNudges, partnerFeed, lastSeenAt, currentUserId, unreadCheerCount],
  );

  const items = useMemo(
    () =>
      buildPartnerInboxItems({
        incomingRequests,
        unreadNudges,
        feed: partnerFeed,
        lastSeenAt,
        currentUserId,
        unreadCheerCount,
        maxItems: 4,
      }),
    [incomingRequests, unreadNudges, partnerFeed, lastSeenAt, currentUserId, unreadCheerCount],
  );

  const overflow = Math.max(0, totalCount - items.length);

  const runAction = (action: PartnerInboxAction) => {
    switch (action.type) {
      case 'accept_request':
        void onAccept(action.requestId);
        break;
      case 'nudge_back':
        void onNudgeBack(action.userId);
        break;
      case 'open_tasks':
        if (onOpenTasks) onOpenTasks();
        else router.push('/(tabs)/tasks' as any);
        break;
      case 'activity_action':
        onPartnerActivityAction?.(action.event, action.kind);
        break;
      case 'open_partners':
        if (onOpenPartners) onOpenPartners();
        else router.push('/friends' as any);
        break;
    }
  };

  if (totalCount <= 0) return null;

  const badgeLabel = totalCount > 9 ? '9+' : String(totalCount);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Users size={16} color={colors.primary} strokeWidth={2.4} />
          <Text style={[styles.title, { color: colors.text }]}>From your circle</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{badgeLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/friends' as any)} hitSlop={8}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.summary, { color: colors.textSecondary }]}>
        Requests, nudges, and updates from people who help you show up
      </Text>

      <View style={styles.list}>
        {items.map((item) => {
          const Icon = rowIcon(item.kind);
          const iconColor = rowIconColor(item.kind, colors.primary);
          const isPrimaryFilled = item.kind === 'partner_request';

          return (
            <View
              key={item.id}
              style={[styles.row, { backgroundColor: colors.surfaceSecondary ?? colors.border + '33' }]}
            >
              <Icon size={16} color={iconColor} strokeWidth={2.3} />
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.subtitle}
                </Text>
                {item.timeLabel ? (
                  <Text style={[styles.rowTime, { color: colors.textMuted }]}>{item.timeLabel}</Text>
                ) : null}
              </View>
              <View style={styles.actionsCol}>
                <TouchableOpacity
                  style={[
                    isPrimaryFilled ? styles.actionBtn : styles.actionBtnOutline,
                    !isPrimaryFilled && { borderColor: colors.primary },
                  ]}
                  onPress={() => runAction(item.primaryAction.action)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      isPrimaryFilled ? styles.actionBtnText : styles.actionBtnOutlineText,
                      !isPrimaryFilled && { color: colors.primary },
                    ]}
                  >
                    {item.primaryAction.label}
                  </Text>
                </TouchableOpacity>
                {item.secondaryAction ? (
                  <TouchableOpacity
                    onPress={() => runAction(item.secondaryAction!.action)}
                    hitSlop={6}
                  >
                    <Text style={[styles.secondaryLink, { color: colors.primary }]}>
                      {item.secondaryAction.label}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {overflow > 0 ? (
        <TouchableOpacity style={styles.overflowRow} onPress={() => router.push('/friends' as any)}>
          <Text style={[styles.overflowText, { color: colors.textSecondary }]}>
            {overflow} more update{overflow === 1 ? '' : 's'} in Partners
          </Text>
          <ChevronRight size={14} color={colors.textMuted} />
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
    flex: 1,
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
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowTime: {
    fontSize: 11,
    marginTop: 2,
  },
  actionsCol: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 108,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#007AFF',
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
  secondaryLink: {
    fontSize: 11,
    fontWeight: '600',
  },
  overflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 2,
  },
  overflowText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
