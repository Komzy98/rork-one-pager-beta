import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Hand, UserPlus, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { FriendNudge, IncomingRequest } from '@/utils/friendsService';

interface AccountabilityAlertsCardProps {
  incomingRequests: IncomingRequest[];
  unreadNudges: FriendNudge[];
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    card: string;
    border: string;
    primary: string;
  };
}

export function AccountabilityAlertsCard({
  incomingRequests,
  unreadNudges,
  colors,
}: AccountabilityAlertsCardProps) {
  const router = useRouter();

  const alertCount = incomingRequests.length + unreadNudges.length;
  const lines = useMemo(() => {
    const items: string[] = [];
    if (incomingRequests.length > 0) {
      const first = incomingRequests[0]?.from;
      const name = first?.displayName || first?.username || 'Someone';
      if (incomingRequests.length === 1) {
        items.push(`${name} wants to be your partner`);
      } else {
        items.push(`${incomingRequests.length} partner requests waiting`);
      }
    }
    if (unreadNudges.length > 0) {
      const first = unreadNudges[0];
      const name = first?.from?.displayName || first?.from?.username || 'A partner';
      const preview = first?.message?.trim();
      if (unreadNudges.length === 1) {
        items.push(preview ? `${name}: ${preview}` : `${name} nudged you to keep your streak going`);
      } else {
        items.push(`${unreadNudges.length} nudges from partners`);
      }
    }
    return items;
  }, [incomingRequests, unreadNudges]);

  if (alertCount <= 0) return null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push('/friends' as any)}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${alertCount} partner notifications`}
    >
      <View style={styles.iconWrap}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}18` }]}>
          {incomingRequests.length > 0 ? (
            <UserPlus size={18} color={colors.primary} strokeWidth={2.4} />
          ) : (
            <Hand size={18} color={colors.primary} strokeWidth={2.4} />
          )}
        </View>
        <View style={styles.alertDot} />
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Users size={14} color={colors.primary} strokeWidth={2.4} />
          <Text style={[styles.title, { color: colors.text }]}>Partner updates</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{alertCount}</Text>
          </View>
        </View>
        {lines.map((line) => (
          <Text key={line} style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
            {line}
          </Text>
        ))}
      </View>

      <ChevronRight size={18} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
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
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
