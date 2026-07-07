import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import type { EventsPalette } from '@/utils/eventsPalette';

interface EventRecommendationBadgeProps {
  label: string;
  palette: EventsPalette;
  /** Overlay on hero imagery vs inline on cards */
  variant?: 'hero-chip' | 'feed-chip' | 'featured-chip';
}

export const EventRecommendationBadge = React.memo(function EventRecommendationBadge({
  label,
  palette,
  variant = 'feed-chip',
}: EventRecommendationBadgeProps) {
  if (!label.trim()) return null;

  const isHero = variant === 'hero-chip';

  return (
    <View
      style={[
        styles.pill,
        isHero && styles.pillHero,
        variant === 'featured-chip' && styles.pillFeatured,
        variant === 'feed-chip' && styles.pillFeed,
        {
          backgroundColor: isHero
            ? 'rgba(0,0,0,0.42)'
            : variant === 'featured-chip'
              ? palette.primaryLight
              : `${palette.textMuted}14`,
          borderColor: isHero
            ? 'rgba(255,255,255,0.18)'
            : variant === 'featured-chip'
              ? `${palette.primary}33`
              : palette.border,
        },
      ]}
    >
      <Sparkles size={9} color={isHero ? '#FFF' : palette.primary} />
      <Text
        style={[
          styles.label,
          { color: isHero ? '#FFF' : variant === 'feed-chip' ? palette.textSecondary : palette.primary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 0.5,
    marginBottom: 8,
    maxWidth: '100%',
  },
  pillHero: {
    marginBottom: 8,
  },
  pillFeatured: {
    marginBottom: 6,
  },
  pillFeed: {
    marginBottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
