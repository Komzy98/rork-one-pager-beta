import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Flame, Hand, Users } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import type { PartnerAtRisk, CircleProgress, HabitGapMotivation } from '@/utils/socialAccountability';
import type { SocialProfile } from '@/utils/friendsService';

interface AccountabilityCircleCardProps {
  circle: CircleProgress;
  partnersAtRisk: PartnerAtRisk[];
  habitGap: HabitGapMotivation | null;
  onNudge: (userId: string) => void | Promise<void>;
  onOpenHabits: () => void;
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
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0,0,0,0.08)"
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
  return profile.displayName?.trim() || profile.username?.trim() || 'Partner';
}

export function AccountabilityCircleCard({
  circle,
  partnersAtRisk,
  habitGap,
  onNudge,
  onOpenHabits,
  colors,
}: AccountabilityCircleCardProps) {
  if (circle.totalPartners === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.ringWrap}>
          <ProgressRing ratio={circle.ratio} color={colors.primary} />
          <View style={styles.ringCenter}>
            <Text style={[styles.ringValue, { color: colors.text }]}>
              {circle.activeToday}/{circle.totalPartners}
            </Text>
          </View>
        </View>
        <View style={styles.topCopy}>
          <View style={styles.titleRow}>
            <Users size={16} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Your circle today</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{circle.label}</Text>
        </View>
      </View>

      {habitGap ? (
        <TouchableOpacity
          style={[styles.habitGapRow, { backgroundColor: `${colors.primary}12` }]}
          onPress={onOpenHabits}
          activeOpacity={0.8}
        >
          <Flame size={16} color={colors.primary} />
          <Text style={[styles.habitGapText, { color: colors.text }]}>
            {habitGap.remaining === 1
              ? `You're 1 habit from matching ${habitGap.partnerName} today`
              : `You're ${habitGap.remaining} habits from matching ${habitGap.partnerName} today`}
          </Text>
        </TouchableOpacity>
      ) : null}

      {partnersAtRisk.length > 0 ? (
        <View style={styles.riskSection}>
          <Text style={[styles.riskLabel, { color: colors.textMuted }]}>PARTNERS AT RISK</Text>
          {partnersAtRisk.map(({ profile, reason }) => (
            <View
              key={profile.id}
              style={[styles.riskRow, { backgroundColor: colors.surfaceSecondary ?? colors.border + '33' }]}
            >
              <View style={styles.riskCopy}>
                <Text style={[styles.riskName, { color: colors.text }]} numberOfLines={1}>
                  {partnerLabel(profile)}
                </Text>
                <Text style={[styles.riskReason, { color: colors.textMuted }]}>{reason}</Text>
              </View>
              <TouchableOpacity
                style={[styles.nudgeBtn, { borderColor: colors.primary }]}
                onPress={() => void onNudge(profile.id)}
              >
                <Hand size={14} color={colors.primary} />
                <Text style={[styles.nudgeBtnText, { color: colors.primary }]}>Nudge</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ringWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  topCopy: {
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
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
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
  riskLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
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
});
