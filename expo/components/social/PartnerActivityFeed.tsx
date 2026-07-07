import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, PartyPopper, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { ActivityEvent } from '@/utils/activityService';
import {
  getActivityEventRoute,
  groupActivityFeed,
} from '@/utils/activityFeedMeta';

interface PartnerActivityFeedProps {
  feed: ActivityEvent[];
  activeTodayCount: number;
  presenceLabel: string | null;
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    card: string;
    border: string;
    primary: string;
  };
  onCheer: (eventId: string, on: boolean) => void;
  maxGroups?: number;
  maxPerGroup?: number;
}

export const PartnerActivityFeed = React.memo(function PartnerActivityFeed({
  feed,
  activeTodayCount,
  presenceLabel,
  colors,
  onCheer,
  maxGroups = 3,
  maxPerGroup = 2,
}: PartnerActivityFeedProps) {
  const router = useRouter();

  const groups = useMemo(
    () => groupActivityFeed(feed, maxPerGroup).slice(0, maxGroups),
    [feed, maxGroups, maxPerGroup]
  );

  if (groups.length === 0 && activeTodayCount <= 0) {
    return null;
  }

  const openEvent = (event: ActivityEvent) => {
    const route = getActivityEventRoute(event);
    if (!route) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Users size={20} color={colors.text} strokeWidth={2} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Partner Activity</Text>
        </View>
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/friends' as any)}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>See all</Text>
          <ChevronRight size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {presenceLabel ? (
        <View style={styles.presence}>
          <View style={styles.liveDot} />
          <Text style={[styles.presenceText, { color: colors.textSecondary }]}>{presenceLabel}</Text>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.category} style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{group.label}</Text>
          {group.events.map((event) => (
            <View
              key={event.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => openEvent(event)}
                activeOpacity={getActivityEventRoute(event) ? 0.75 : 1}
              >
                {event.author?.displayName || event.author?.username ? (
                  <Text style={[styles.author, { color: colors.primary }]} numberOfLines={1}>
                    {event.author.displayName ?? `@${event.author.username}`}
                  </Text>
                ) : null}
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                  {event.title}
                </Text>
                {event.body ? (
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {event.body}
                  </Text>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cheerBtn,
                  {
                    borderColor: event.cheeredByMe ? '#F59E0B' : colors.border,
                    backgroundColor: event.cheeredByMe ? '#F59E0B18' : 'transparent',
                  },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void onCheer(event.id, !event.cheeredByMe);
                }}
                activeOpacity={0.7}
              >
                <PartyPopper size={15} color={event.cheeredByMe ? '#F59E0B' : colors.textMuted} />
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
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  presenceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  group: {
    gap: 8,
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  author: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  cheerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  cheerCount: {
    fontSize: 12,
    fontWeight: '700',
  },
});
