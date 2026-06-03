import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Trophy, Target, TrendingUp, Award } from 'lucide-react-native';

export type ProgressCardType = 'streak' | 'achievement' | 'challenge_win' | 'milestone' | 'summary';

export interface ProgressCardData {
  type: ProgressCardType;
  title: string;
  subtitle?: string;
  value?: string | number;
  valueLabel?: string;
  username?: string;
}

const GRADIENTS: Record<ProgressCardType, [string, string, string]> = {
  streak: ['#FF6A3D', '#F7434C', '#C2185B'],
  achievement: ['#7C3AED', '#5B21B6', '#312E81'],
  challenge_win: ['#0EA5E9', '#2563EB', '#4338CA'],
  milestone: ['#10B981', '#059669', '#047857'],
  summary: ['#1E293B', '#334155', '#0F172A'],
};

function Icon({ type, size = 64 }: { type: ProgressCardType; size?: number }) {
  const color = '#FFFFFF';
  switch (type) {
    case 'streak':
      return <Flame size={size} color={color} strokeWidth={2} />;
    case 'achievement':
      return <Trophy size={size} color={color} strokeWidth={2} />;
    case 'challenge_win':
      return <Award size={size} color={color} strokeWidth={2} />;
    case 'milestone':
      return <Target size={size} color={color} strokeWidth={2} />;
    case 'summary':
    default:
      return <TrendingUp size={size} color={color} strokeWidth={2} />;
  }
}

/**
 * A fixed-size, screenshot-friendly progress card.
 * Rendered off-screen and captured to an image by `shareProgress`.
 */
export const ShareableProgressCard: React.FC<{ data: ProgressCardData }> = ({ data }) => {
  const gradient = GRADIENTS[data.type] ?? GRADIENTS.summary;

  return (
    <View style={styles.card} collapsable={false}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconBadge}>
          <Icon type={data.type} size={56} />
        </View>

        {data.value !== undefined && (
          <View style={styles.valueRow}>
            <Text style={styles.value} numberOfLines={1}>
              {data.value}
            </Text>
            {!!data.valueLabel && <Text style={styles.valueLabel}>{data.valueLabel}</Text>}
          </View>
        )}

        <Text style={styles.title} numberOfLines={2}>
          {data.title}
        </Text>

        {!!data.subtitle && (
          <Text style={styles.subtitle} numberOfLines={3}>
            {data.subtitle}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.brandDot} />
          <Text style={styles.brand}>One Pager</Text>
          {!!data.username && <Text style={styles.handle}>· @{data.username}</Text>}
        </View>
      </LinearGradient>
    </View>
  );
};

const CARD_WIDTH = 360;
const CARD_HEIGHT = 450;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 36,
    justifyContent: 'center',
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 76,
  },
  valueLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 10,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  handle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ShareableProgressCard;
