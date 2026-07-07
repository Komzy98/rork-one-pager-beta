import React, { useCallback } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { LocalEvent } from '@/types/events';
import { EVENT_CATEGORY_META } from '@/utils/eventCategoryMeta';
import type { EventsPalette } from '@/utils/eventsPalette';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 10;
const TILE_WIDTH = (SCREEN_WIDTH - 40 - GAP) / 2;
const TILE_HEIGHT = 112;

interface EventsCategoryBentoProps {
  events: LocalEvent[];
  selectedCategory: string;
  palette: EventsPalette;
  onSelectCategory: (categoryId: string) => void;
}

export const EventsCategoryBento = React.memo(function EventsCategoryBento({
  events,
  selectedCategory,
  palette,
  onSelectCategory,
}: EventsCategoryBentoProps) {
  const categories = EVENT_CATEGORY_META.filter((c) => c.id !== 'all');

  const coverForCategory = useCallback(
    (categoryId: string): string | undefined => {
      return events.find((e) => e.category === categoryId)?.image;
    },
    [events]
  );

  return (
    <View style={styles.grid}>
      {categories.map((cat) => {
        const isActive = selectedCategory === cat.id;
        const cover = coverForCategory(cat.id);
        const CatIcon = cat.icon;

        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.tile,
              {
                borderColor: isActive ? cat.color : palette.border,
                shadowColor: isActive ? cat.color : 'transparent',
              },
              isActive && styles.tileActive,
            ]}
            activeOpacity={0.88}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectCategory(isActive ? 'all' : cat.id);
            }}
          >
            {cover ? (
              <ImageBackground source={{ uri: cover }} style={styles.tileBg} imageStyle={styles.tileBgImage}>
                <LinearGradient
                  colors={[`${cat.color}55`, 'rgba(7,6,11,0.88)']}
                  style={styles.tileGradient}
                />
              </ImageBackground>
            ) : (
              <LinearGradient
                colors={[`${cat.color}44`, `${cat.color}18`, palette.surface]}
                style={styles.tileGradient}
              />
            )}

            <View style={styles.tileContent}>
              <View style={[styles.iconBadge, { backgroundColor: `${cat.color}33` }]}>
                <CatIcon size={16} color={cat.color} />
              </View>
              <Text style={[styles.tileLabel, { color: palette.text }]} numberOfLines={2}>
                {cat.label}
              </Text>
            </View>

            {isActive ? <View style={[styles.glowRing, { borderColor: cat.color }]} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: GAP,
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tileActive: {
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  tileBg: {
    ...StyleSheet.absoluteFillObject,
  },
  tileBgImage: {
    borderRadius: 18,
  },
  tileGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tileContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    gap: 6,
  },
  iconBadge: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: 10,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 2,
  },
});
