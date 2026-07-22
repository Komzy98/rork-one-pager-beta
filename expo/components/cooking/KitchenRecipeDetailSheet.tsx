import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Clock,
  Users,
  Flame,
  Heart,
  ChefHat,
  Leaf,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';
import { KitchenRecipeImage } from '@/components/cooking/KitchenRecipeImage';
import { appFont } from '@/constants/fonts';

const SW = Dimensions.get('window').width;
const IMG_H = Math.min(320, SW * 0.72);

type Props = {
  visible: boolean;
  recipe: KitchenRecipeDto | null;
  loading: boolean;
  saved: boolean;
  isDark: boolean;
  colors: { text: string; muted: string; accent: string; card: string; border: string; bg: string };
  onClose: () => void;
  onToggleSave: () => void;
  onStartGuided: () => void;
  onMarkCooked: () => void;
};

function DietBadge({
  label,
  colors,
}: {
  label: string;
  colors: { accent: string; card: string; text: string };
}) {
  return (
    <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.accent + '40' }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

export function KitchenRecipeDetailSheet({
  visible,
  recipe,
  loading,
  saved,
  colors,
  onClose,
  onToggleSave,
  onStartGuided,
  onMarkCooked,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!recipe) return null;

  const n = recipe.nutrition;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <View style={styles.heroWrap}>
            <KitchenRecipeImage uri={recipe.image} style={{ width: SW, height: IMG_H }} borderRadius={0} />
            <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
            <TouchableOpacity
              style={[styles.closeBtn, { top: insets.top + 8 }]}
              onPress={onClose}
              accessibilityLabel="Close recipe"
            >
              <X size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { top: insets.top + 8 }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onToggleSave();
              }}
              accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}
            >
              <Heart size={22} color={saved ? '#FF3B30' : '#FFF'} fill={saved ? '#FF3B30' : 'transparent'} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
            <Text style={[styles.summary, { color: colors.muted }]}>{recipe.summary || recipe.subtitle}</Text>

            <View style={styles.statRow}>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Clock size={16} color={colors.accent} />
                <Text style={[styles.statVal, { color: colors.text }]}>{recipe.readyInMinutes}m</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Total</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Users size={16} color={colors.accent} />
                <Text style={[styles.statVal, { color: colors.text }]}>{recipe.servings}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Serves</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Flame size={16} color={colors.accent} />
                <Text style={[styles.statVal, { color: colors.text }]}>{recipe.calories}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Kcal</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              {recipe.vegan ? <DietBadge label="Vegan" colors={colors} /> : null}
              {recipe.vegetarian && !recipe.vegan ? <DietBadge label="Vegetarian" colors={colors} /> : null}
              {recipe.glutenFree ? <DietBadge label="Gluten-free" colors={colors} /> : null}
              {recipe.dairyFree ? <DietBadge label="Dairy-free" colors={colors} /> : null}
              {recipe.healthScore != null && recipe.healthScore > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent + '18' }]}>
                  <Leaf size={12} color={colors.accent} />
                  <Text style={[styles.badgeText, { color: colors.accent }]}>Health {recipe.healthScore}</Text>
                </View>
              ) : null}
            </View>

            {n && (n.protein > 0 || n.carbs > 0) ? (
              <View style={[styles.macros, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrition</Text>
                <View style={styles.macroRow}>
                  <Text style={[styles.macro, { color: colors.muted }]}>Protein {n.protein}g</Text>
                  <Text style={[styles.macro, { color: colors.muted }]}>Carbs {n.carbs}g</Text>
                  <Text style={[styles.macro, { color: colors.muted }]}>Fat {n.fat}g</Text>
                </View>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                <View style={styles.ingList}>
                  {recipe.ingredients.map((ing, i) => (
                    <View key={`${i}-${ing}`} style={[styles.ingRow, { borderColor: colors.border }]}>
                      <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.ingText, { color: colors.text }]}>{ing}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Method</Text>
                {recipe.steps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: colors.accent }]}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.bg, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onMarkCooked();
            }}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cooked this</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStartGuided();
            }}
            disabled={loading || recipe.steps.length === 0}
          >
            <ChefHat size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Guided cook</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroWrap: { width: SW, height: IMG_H, backgroundColor: '#E8E0DA' },
  closeBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  title: { ...appFont('700', { display: true }), fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  summary: { ...appFont('400'), fontSize: 15, lineHeight: 22, marginTop: 10 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statVal: { ...appFont('700'), fontSize: 18, fontWeight: '700' as const },
  statLbl: { ...appFont('500'), fontSize: 11, fontWeight: '500' as const },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: { ...appFont('600'), fontSize: 12, fontWeight: '600' as const },
  macros: { marginTop: 18, padding: 14, borderRadius: 16, borderWidth: 1 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  macro: { ...appFont('500'), fontSize: 13, fontWeight: '500' as const },
  sectionTitle: { ...appFont('700'), fontSize: 17, fontWeight: '700' as const, marginTop: 8 },
  ingList: { marginTop: 10, gap: 8 },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  ingText: { ...appFont('400'), flex: 1, fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { ...appFont('700'), color: '#FFF', fontSize: 12, fontWeight: '700' as const },
  stepText: { ...appFont('400'), flex: 1, fontSize: 14, lineHeight: 21 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...appFont('600'), fontSize: 15, fontWeight: '600' as const },
  primaryBtn: {
    flex: 1.4,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { ...appFont('700'), color: '#FFF', fontSize: 15, fontWeight: '700' as const },
});
