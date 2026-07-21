import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, CheckCircle2, Flame, PartyPopper, Sparkles, Ticket, Tv, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { ActivityEvent, ActivityType } from '@/utils/activityService';
import type { ActivityFeedCategory } from '@/utils/activityFeedMeta';
import {
  formatActivityTimeAgo,
  formatPartnerActivityHeadline,
  getActivityCategoryVisual,
  getActivityEventRoute,
  getActivityFeedCategory,
  partnerActivityInitials,
  selectPartnerActivityPreview,
} from '@/utils/activityFeedMeta';
import {
  formatActionOrientedHeadline,
  getActivityRowAction,
  type ActivityRowActionKind,
} from '@/utils/socialAccountability';

const CATEGORY_ICONS = {
  going_out: Ticket,
  watching: Tv,
  streaks: Flame,
  tasks_done: CheckCircle2,
  other: Sparkles,
} satisfies Record<ActivityFeedCategory, typeof Ticket>;

function getActivityTypeIcon(type: ActivityType | string) {
  return CATEGORY_ICONS[getActivityFeedCategory(type)];
}

interface PartnerActivityFeedProps {
  feed: ActivityEvent[];
  activeTodayCount: number;
  presenceLabel: string | null;
  currentUserId?: string;
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    card: string;
    border: string;
    primary: string;
    surfaceSecondary?: string;
  };
  onCheer: (eventId: string, on: boolean) => void;
  onRowAction?: (event: ActivityEvent, kind: ActivityRowActionKind) => void;
  actionOriented?: boolean;
  maxItems?: number;
  alertCount?: number;
}

export const PartnerActivityFeed = React.memo(function PartnerActivityFeed({
  feed,
  activeTodayCount,
  presenceLabel,
  currentUserId,
  colors,
  onCheer,
  onRowAction,
  actionOriented = true,
  maxItems = 4,
  alertCount = 0,
}: PartnerActivityFeedProps) {
  const router = useRouter();

  const preview = useMemo(
    () => selectPartnerActivityPreview(feed, { currentUserId, limit: maxItems }),
    [feed, currentUserId, maxItems],
  );

  if (preview.length === 0) {
    return null;
  }

  const openEvent = (event: ActivityEvent) => {
    const route = getActivityEventRoute(event);
    if (!route) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const dividerColor = colors.surfaceSecondary ?? colors.border;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Users size={18} color={colors.text} strokeWidth={2.2} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your people</Text>
          {alertCount > 0 ? <View style={styles.headerAlertDot} /> : null}
        </View>
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/friends' as any)}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>See all</Text>
          {alertCount > 0 ? <View style={styles.viewAllDot} /> : null}
          <ChevronRight size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {presenceLabel ? (
        <View style={[styles.presencePill, { backgroundColor: '#22C55E14', borderColor: '#22C55E33' }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.presenceText, { color: colors.textSecondary }]}>{presenceLabel}</Text>
        </View>
      ) : null}

      <View style={[styles.digestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {preview.map((event, index) => {
            const visual = getActivityCategoryVisual(event.type);
            const TypeIcon = getActivityTypeIcon(event.type);
            const { line, detail } = actionOriented
              ? formatActionOrientedHeadline(event)
              : formatPartnerActivityHeadline(event);
            const rowAction = getActivityRowAction(event);
            const route = getActivityEventRoute(event);
            const isLast = index === preview.length - 1;
            const showPrimaryAction = onRowAction && rowAction.kind !== 'cheer';

            return (
              <View
                key={event.id}
                style={[
                  styles.row,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor },
                ]}
              >
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => openEvent(event)}
                  activeOpacity={route ? 0.72 : 1}
                  disabled={!route}
                >
                  {event.author?.avatarUrl ? (
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: event.author.avatarUrl }} style={styles.avatar} />
                      <View style={[styles.typeBadge, { backgroundColor: visual.background, borderColor: colors.card }]}>
                        <TypeIcon size={11} color={visual.tint} strokeWidth={2.4} />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.avatarWrap}>
                      <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: visual.background }]}>
                        <Text style={[styles.avatarText, { color: visual.tint }]}>
                          {partnerActivityInitials(event)}
                        </Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: visual.background, borderColor: colors.card }]}>
                        <TypeIcon size={11} color={visual.tint} strokeWidth={2.4} />
                      </View>
                    </View>
                  )}

                  <View style={styles.copy}>
                    <Text style={[styles.headline, { color: colors.text }]} numberOfLines={2}>
                      {line}
                    </Text>
                    {detail ? (
                      <Text style={[styles.detail, { color: colors.textMuted }]} numberOfLines={1}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>

                  <Text style={[styles.time, { color: colors.textMuted }]}>
                    {formatActivityTimeAgo(event.createdAt)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.cheerBtn,
                    {
                      borderColor: event.cheeredByMe ? '#F59E0B' : colors.border,
                      backgroundColor: event.cheeredByMe ? '#F59E0B14' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (showPrimaryAction) {
                      onRowAction?.(event, rowAction.kind);
                    } else {
                      void onCheer(event.id, !event.cheeredByMe);
                    }
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={showPrimaryAction ? rowAction.label : event.cheeredByMe ? 'Remove cheer' : 'Cheer partner'}
                >
                  {showPrimaryAction ? (
                    <Text style={[styles.actionLabel, { color: colors.primary }]}>{rowAction.label}</Text>
                  ) : (
                    <>
                      <PartyPopper size={14} color={event.cheeredByMe ? '#F59E0B' : colors.textMuted} />
                      {event.cheersCount > 0 ? (
                        <Text
                          style={[
                            styles.cheerCount,
                            { color: event.cheeredByMe ? '#F59E0B' : colors.textMuted },
                          ]}
                        >
                          {event.cheersCount}
                        </Text>
                      ) : null}
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerAlertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  viewAllDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presencePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  presenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  digestCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    gap: 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  copy: {
    flex: 1,
    gap: 1,
    paddingRight: 4,
  },
  headline: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  detail: {
    fontSize: 11,
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'right',
  },
  cheerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  cheerCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
});
