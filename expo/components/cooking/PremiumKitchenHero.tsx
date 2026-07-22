import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Flame, Heart, Sparkles, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';
import { KitchenRecipeImage } from '@/components/cooking/KitchenRecipeImage';
import { appFont } from '@/constants/fonts';

const { width: SW } = Dimensions.get('window');
export const KITCHEN_HERO_HEIGHT = Math.min(420, SW * 0.92);

type Props = {
  recipe: KitchenRecipeDto;
  saved: boolean;
  colors: { text: string; muted: string; accent: string; card: string; border: string };
  onPress: () => void;
  onToggleSave: () => void;
};

export function PremiumKitchenHero({ recipe, saved, colors, onPress, onToggleSave }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.wrap, { borderColor: colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={`Featured recipe, ${recipe.title}`}
    >
      <KitchenRecipeImage uri={recipe.image} style={styles.image} borderRadius={24} fill />
      <LinearGradient colors={['transparent', 'rgba(12,8,6,0.55)', 'rgba(12,8,6,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.topRow}>
        <View style={styles.chip}>
          <Sparkles size={12} color="#FFF" />
          <Text style={styles.chipText}>Chef’s pick</Text>
        </View>
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggleSave();
          }}
          accessibilityLabel={saved ? 'Remove from saved' : 'Save recipe'}
        >
          <Heart size={18} color={saved ? '#FF3B30' : '#FFF'} fill={saved ? '#FF3B30' : 'transparent'} />
        </TouchableOpacity>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {recipe.subtitle}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Star size={13} color="#FFD700" fill="#FFD700" />
            <Text style={styles.metaText}>{recipe.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.dot} />
          <View style={styles.metaItem}>
            <Clock size={13} color="rgba(255,255,255,0.9)" />
            <Text style={styles.metaText}>{recipe.readyInMinutes} min</Text>
          </View>
          <View style={styles.dot} />
          <View style={styles.metaItem}>
            <Flame size={13} color="rgba(255,255,255,0.9)" />
            <Text style={styles.metaText}>{recipe.calories} kcal</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    height: KITCHEN_HERO_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: { width: '100%', height: '100%' },
  topRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(196, 92, 38, 0.92)',
  },
  chipText: { ...appFont('700'), color: '#FFF', fontSize: 12, fontWeight: '700' as const },
  heartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 18, right: 18, bottom: 20 },
  title: {
    ...appFont('700', { display: true }),
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: { ...appFont('400'), color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 6, lineHeight: 19 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...appFont('600'), color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '600' as const },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' },
});
