import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KITCHEN_HERO_HEIGHT } from '@/components/cooking/PremiumKitchenHero';

type Props = { colors: { card: string; border: string } };

export function KitchenFeedSkeleton({ colors }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]} />
      <View style={styles.row}>
        <View style={[styles.pill, { backgroundColor: colors.card }]} />
        <View style={[styles.pill, { backgroundColor: colors.card }]} />
        <View style={[styles.pill, { backgroundColor: colors.card }]} />
      </View>
      <View style={styles.rail}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  hero: {
    marginHorizontal: 20,
    height: KITCHEN_HERO_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
    opacity: 0.6,
  },
  row: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  pill: { width: 88, height: 36, borderRadius: 18, opacity: 0.5 },
  rail: { flexDirection: 'row', paddingHorizontal: 20, gap: 14 },
  tile: { width: 168, height: 180, borderRadius: 16, borderWidth: 1, opacity: 0.5 },
});
