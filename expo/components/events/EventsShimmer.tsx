import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { EventsPalette } from '@/utils/eventsPalette';
import { EVENT_CATEGORY_META } from '@/utils/eventCategoryMeta';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BENTO_GAP = 12;
const BENTO_TILE_WIDTH = (SCREEN_WIDTH - 40 - BENTO_GAP) / 2;
const BENTO_TILE_HEIGHT = 132;
const RAIL_CARD_WIDTH = SCREEN_WIDTH * 0.42;
const RAIL_CARD_HEIGHT = 220;

function ShimmerBlock({
  style,
  palette,
}: {
  style: StyleProp<ViewStyle>;
  palette: EventsPalette;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerBlock,
        { backgroundColor: palette.surfaceSecondary, opacity },
        style,
      ]}
    />
  );
}

export function EventsHeroSkeleton({ palette }: { palette: EventsPalette }) {
  return (
    <View style={[styles.heroWrap, { backgroundColor: palette.surface }]}>
      <ShimmerBlock palette={palette} style={styles.heroImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={styles.heroScrim}
      />
      <View style={styles.heroContent}>
        <ShimmerBlock palette={palette} style={styles.heroChip} />
        <ShimmerBlock palette={palette} style={styles.heroTitle} />
        <ShimmerBlock palette={palette} style={styles.heroMeta} />
        <View style={styles.heroActions}>
          <ShimmerBlock palette={palette} style={styles.heroPrimaryBtn} />
          <ShimmerBlock palette={palette} style={styles.heroSecondaryBtn} />
        </View>
      </View>
    </View>
  );
}

export function EventsRailSkeleton({
  palette,
  count = 3,
}: {
  palette: EventsPalette;
  count?: number;
}) {
  return (
    <View style={styles.railRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`rail-skeleton-${index}`} style={styles.railCard}>
          <ShimmerBlock palette={palette} style={styles.railPoster} />
          <ShimmerBlock palette={palette} style={styles.railTitle} />
          <ShimmerBlock palette={palette} style={styles.railMeta} />
        </View>
      ))}
    </View>
  );
}

export function EventsBentoSkeleton({ palette }: { palette: EventsPalette }) {
  const categories = EVENT_CATEGORY_META.filter((c) => c.id !== 'all');

  return (
    <View style={styles.bentoGrid}>
      {categories.map((cat) => (
        <View
          key={cat.id}
          style={[
            styles.bentoTile,
            { borderColor: palette.border, backgroundColor: palette.surface },
          ]}
        >
          <ShimmerBlock palette={palette} style={styles.bentoIcon} />
          <View style={styles.bentoFooter}>
            <ShimmerBlock palette={palette} style={styles.bentoLabel} />
            <ShimmerBlock palette={palette} style={styles.bentoCount} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerBlock: {
    borderRadius: 10,
  },
  heroWrap: {
    height: 400,
    marginBottom: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    gap: 10,
  },
  heroChip: {
    width: 120,
    height: 24,
    borderRadius: 12,
  },
  heroTitle: {
    width: '78%',
    height: 28,
    borderRadius: 8,
  },
  heroMeta: {
    width: '55%',
    height: 14,
    borderRadius: 6,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  heroPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
  },
  heroSecondaryBtn: {
    width: 108,
    height: 44,
    borderRadius: 14,
  },
  railRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  railCard: {
    width: RAIL_CARD_WIDTH,
    gap: 8,
  },
  railPoster: {
    width: RAIL_CARD_WIDTH,
    height: RAIL_CARD_HEIGHT,
    borderRadius: 18,
  },
  railTitle: {
    width: '82%',
    height: 16,
    borderRadius: 6,
  },
  railMeta: {
    width: '58%',
    height: 12,
    borderRadius: 6,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: BENTO_GAP,
  },
  bentoTile: {
    width: BENTO_TILE_WIDTH,
    height: BENTO_TILE_HEIGHT,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  bentoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  bentoFooter: {
    gap: 6,
  },
  bentoLabel: {
    width: '72%',
    height: 14,
    borderRadius: 6,
  },
  bentoCount: {
    width: '48%',
    height: 11,
    borderRadius: 5,
  },
});
