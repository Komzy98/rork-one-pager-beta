import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Heart, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';
import { KitchenRecipeImage } from '@/components/cooking/KitchenRecipeImage';
import { appFont } from '@/constants/fonts';

const TILE_W = 168;

type Props = {
  recipe: KitchenRecipeDto;
  saved: boolean;
  colors: { text: string; muted: string; accent: string; border: string };
  onPress: () => void;
  onToggleSave: () => void;
  compact?: boolean;
};

export function PremiumRecipeTile({ recipe, saved, colors, onPress, onToggleSave, compact }: Props) {
  const w = compact ? '100%' : TILE_W;
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.tile, { width: w, borderColor: colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={recipe.title}
    >
      <View style={styles.imageWrap}>
        <KitchenRecipeImage uri={recipe.image} style={styles.image} borderRadius={16} />
        <TouchableOpacity
          style={styles.heart}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggleSave();
          }}
          accessibilityLabel={saved ? 'Unsave' : 'Save'}
        >
          <Heart size={15} color={saved ? '#FF3B30' : '#FFF'} fill={saved ? '#FF3B30' : 'transparent'} />
        </TouchableOpacity>
        <View style={styles.ratingPill}>
          <Star size={10} color="#FFD700" fill="#FFD700" />
          <Text style={styles.ratingText}>{recipe.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {recipe.title}
      </Text>
      <View style={styles.meta}>
        <Clock size={12} color={colors.muted} />
        <Text style={[styles.metaText, { color: colors.muted }]}>{recipe.readyInMinutes} min</Text>
        <Text style={[styles.metaText, { color: colors.muted }]}> · {recipe.difficulty}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { width: TILE_W },
  imageWrap: { height: 128, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  image: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  ratingText: { ...appFont('700'), color: '#FFF', fontSize: 11, fontWeight: '700' as const },
  name: { ...appFont('700'), fontSize: 14, fontWeight: '700' as const, lineHeight: 18, minHeight: 36 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { ...appFont('500'), fontSize: 12, fontWeight: '500' as const },
});
