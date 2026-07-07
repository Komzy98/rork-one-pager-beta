import React, { useCallback, useMemo } from 'react';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import type { LocalEvent } from '@/types/events';
import { EVENT_CATEGORY_META } from '@/utils/eventCategoryMeta';
import type { EventsPalette } from '@/utils/eventsPalette';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 12;
const TILE_WIDTH = (SCREEN_WIDTH - 40 - GAP) / 2;
const TILE_HEIGHT = 132;

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

  const countsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    }
    return counts;
  }, [events]);

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
        const count = countsByCategory.get(cat.id) ?? 0;
        const hasCover = Boolean(cover);
        const labelColor = hasCover ? palette.textOnImage : palette.text;
        const sublabelColor = hasCover ? palette.textOnImageSecondary : palette.textSecondary;

        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.tile,
              {
                borderColor: isActive ? cat.color : palette.border,
                shadowColor: isActive ? cat.color : '#000',
              },
              isActive && styles.tileActive,
            ]}
            activeOpacity={0.9}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectCategory(isActive ? 'all' : cat.id);
            }}
          >
            {hasCover ? (
              <ImageBackground
                source={{ uri: cover }}
                style={styles.tileBg}
                imageStyle={styles.tileBgImage}
              >
                <LinearGradient
                  colors={[`${cat.color}55`, `${cat.color}22`, 'rgba(0,0,0,0.08)']}
                  locations={[0, 0.45, 1]}
                  style={styles.tileGradient}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.72)']}
                  locations={[0.35, 1]}
                  style={styles.tileGradient}
                />
              </ImageBackground>
            ) : (
              <LinearGradient
                colors={[`${cat.color}38`, `${cat.color}16`, palette.surface]}
                locations={[0, 0.55, 1]}
                style={styles.tileGradient}
              />
            )}

            <View style={styles.tileSheen} pointerEvents="none" />
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: hasCover ? 'rgba(255,255,255,0.16)' : `${cat.color}20`,
                  borderColor: hasCover ? 'rgba(255,255,255,0.28)' : `${cat.color}35`,
                },
              ]}
            >
              <CatIcon size={15} color={hasCover ? '#FFFFFF' : cat.color} strokeWidth={2.25} />
            </View>

            {isActive ? (
              <View style={[styles.activePill, { backgroundColor: cat.color }]}>
                <Check size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
            ) : null}

            <View style={styles.footer}>
              <BlurView
                intensity={hasCover ? 42 : 28}
                tint={palette.blurTint}
                style={[
                  styles.footerBlur,
                  {
                    backgroundColor: hasCover ? 'rgba(8,8,12,0.28)' : `${palette.card}CC`,
                    borderColor: hasCover ? 'rgba(255,255,255,0.14)' : palette.border,
                  },
                ]}
              >
                <Text style={[styles.tileLabel, { color: labelColor }]} numberOfLines={1}>
                  {cat.label}
                </Text>
                <Text style={[styles.tileCount, { color: sublabelColor }]} numberOfLines={1}>
                  {count === 1 ? '1 event' : `${count} events`}
                </Text>
              </BlurView>
            </View>

            {isActive ? (
              <View
                style={[styles.activeRing, { borderColor: cat.color, shadowColor: cat.color }]}
                pointerEvents="none"
              />
            ) : null}
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
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  tileActive: {
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tileBg: {
    ...StyleSheet.absoluteFillObject,
  },
  tileBgImage: {
    borderRadius: 20,
    transform: [{ scale: 1.08 }],
  },
  tileGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tileSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  activePill: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  footer: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  footerBlur: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
    borderWidth: 1,
    borderRadius: 14,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  tileCount: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  activeRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
