import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';
import { PremiumRecipeTile } from '@/components/cooking/PremiumRecipeTile';
import { appFont } from '@/constants/fonts';

type Props = {
  title: string;
  subtitle: string;
  recipes: KitchenRecipeDto[];
  colors: { text: string; muted: string; accent: string; border: string };
  savedIds: Set<string>;
  onOpenRecipe: (recipe: KitchenRecipeDto) => void;
  onToggleSave: (id: string) => void;
  onSeeAll?: () => void;
};

export function PremiumRecipeRail({
  title,
  subtitle,
  recipes,
  colors,
  savedIds,
  onOpenRecipe,
  onToggleSave,
  onSeeAll,
}: Props) {
  if (!recipes.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
        {onSeeAll ? (
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSeeAll();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.seeAll, { color: colors.accent }]}>See all</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {recipes.map((recipe) => (
          <PremiumRecipeTile
            key={recipe.id}
            recipe={recipe}
            saved={savedIds.has(recipe.id)}
            colors={colors}
            onPress={() => onOpenRecipe(recipe)}
            onToggleSave={() => onToggleSave(recipe.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: { ...appFont('700'), fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  subtitle: { ...appFont('400'), fontSize: 13, marginTop: 2 },
  seeAll: { ...appFont('600'), fontSize: 14, fontWeight: '600' as const },
  scroll: { paddingHorizontal: 20, gap: 14 },
});
