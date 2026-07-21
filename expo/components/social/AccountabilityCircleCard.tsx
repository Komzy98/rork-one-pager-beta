import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Flame, Hand, Users } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import type { PartnerAtRisk, CircleProgress, HabitGapMotivation } from '@/utils/socialAccountability';
import type { SocialProfile } from '@/utils/friendsService';

interface AccountabilityCircleCardProps {
  circle: CircleProgress;
  partners: SocialProfile[];
  partnersAtRisk: PartnerAtRisk[];
  habitGap: HabitGapMotivation | null;
  alertCount?: number;
  onNudge: (userId: string) => void | Promise<void>;
  onOpenHabits: () => void;
  onOpenPartners: () => void;
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

function ProgressRing({ ratio, color }: { ratio: number; color: string }) {
  const size = 48;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

function partnerLabel(profile: SocialProfile): string {
  const full = profile.displayName?.trim() || profile.username?.trim() || 'Partner';
  const first = full.split(/\s+/)[0] || full;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}

function partnerInitials(profile: SocialProfile): string {
  const name = profile.displayName?.trim() || profile.username?.trim() || '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function PartnerChip({
  profile,
  colors,
}: {
  profile: SocialProfile;
  colors: AccountabilityCircleCardProps['colors'];
}) {
  return (
    <View style={styles.partnerChip}>
      {profile.avatarUrl ? (
        <Image source={{ uri: profile.avatarUrl }} style={styles.partnerAvatar} contentFit="cover" />
      ) : (
        <View style={[styles.partnerAvatar, styles.partnerAvatarFallback, { backgroundColor: `${colors.primary}18` }]}>
          <Text style={[styles.partnerAvatarText, { color: colors.primary }]}>{partnerInitials(profile)}</Text>
        </View>
      )}
      <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={1}>
        {partnerLabel(profile)}
      </Text>
      <View style={styles.streakRow}>
        <Flame size={11} color="#FF6A3D" />
        <Text style={[styles.streakText, { color: colors.textSecondary }]}>{profile.currentStreak}d</Text>
      </View>
    </View>
  );
}

export function AccountabilityCircleCard({
  circle,
  partners,
  partnersAtRisk,
  habitGap,
  alertCount = 0,
  onNudge,
  onOpenHabits,
  onOpenPartners,
  colors,
}: AccountabilityCircleCardProps) {
  if (circle.totalPartners === 0) return null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onOpenPartners}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Open accountability partners"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Accountability Partners</Text>
          {alertCount > 0 ? (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <View style={styles.ringWrap}>
            <ProgressRing ratio={circle.ratio} color={colors.primary} />
            <View style={styles.ringCenter}>
              <Text style={[styles.ringValue, { color: colors.text }]}>
                {circle.activeToday}/{circle.totalPartners}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{circle.label}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.partnerStrip}
        style={styles.partnerScroll}
      >
        {partners.map((profile) => (
          <PartnerChip key={profile.id} profile={profile} colors={colors} />
        ))}
      </ScrollView>

      {habitGap ? (
        <TouchableOpacity
          style={[styles.habitGapRow, { backgroundColor: `${colors.primary}10` }]}
          onPress={() => onOpenHabits()}
          activeOpacity={0.8}
        >
          <Flame size={15} color={colors.primary} />
          <Text style={[styles.habitGapText, { color: colors.text }]}>
            {habitGap.remaining === 1
              ? `1 habit away from matching ${habitGap.partnerName} today`
              : `${habitGap.remaining} habits away from matching ${habitGap.partnerName} today`}
          </Text>
        </TouchableOpacity>
      ) : null}

      {partnersAtRisk.length > 0 ? (
        <View style={styles.riskSection}>
          {partnersAtRisk.slice(0, 2).map(({ profile, reason }) => (
            <View
              key={profile.id}
              style={[styles.riskRow, { backgroundColor: colors.surfaceSecondary ?? colors.border + '33' }]}
            >
              <View style={styles.riskCopy}>
                <Text style={[styles.riskName, { color: colors.text }]} numberOfLines={1}>
                  {partnerLabel(profile)}
                </Text>
                <Text style={[styles.riskReason, { color: colors.textMuted }]} numberOfLines={1}>
                  {reason}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.nudgeBtn, { borderColor: colors.primary }]}
                onPress={() => void onNudge(profile.id)}
              >
                <Hand size={13} color={colors.primary} />
                <Text style={[styles.nudgeBtnText, { color: colors.primary }]}>Nudge</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.quietHint, { backgroundColor: colors.surfaceSecondary ?? colors.border + '22' }]}>
          <Users size={14} color={colors.textMuted} />
          <Text style={[styles.quietHintText, { color: colors.textMuted }]}>
            Tap to manage partners · activity shows below when they check in
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  alertBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ringWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
  },
  partnerScroll: {
    marginHorizontal: -4,
  },
  partnerStrip: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  partnerChip: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  partnerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  partnerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  partnerName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
  },
  habitGapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  habitGapText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  riskSection: {
    gap: 8,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  riskCopy: {
    flex: 1,
    gap: 2,
  },
  riskName: {
    fontSize: 14,
    fontWeight: '700',
  },
  riskReason: {
    fontSize: 12,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  nudgeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quietHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quietHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
