import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  X,
  ChefHat,
  Sparkles,
  Zap,
  Leaf,
  Coffee,
  CookingPot,
  Bookmark,
  Flame,
  Globe2,
  UtensilsCrossed,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useCookingStorage } from '@/hooks/useCookingStorage';
import { usePremiumKitchen } from '@/hooks/usePremiumKitchen';
import { kitchenColors } from '@/utils/kitchenPalette';
import { kitchenDtoToGuidedRecipe } from '@/utils/kitchenRecipeAdapters';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';
import { KeyboardAvoidingScreen } from '@/components/KeyboardAvoidingScreen';
import FeedRetryBanner from '@/components/FeedRetryBanner';
import { PremiumKitchenHero } from '@/components/cooking/PremiumKitchenHero';
import { PremiumRecipeRail } from '@/components/cooking/PremiumRecipeRail';
import { PremiumRecipeTile } from '@/components/cooking/PremiumRecipeTile';
import { KitchenRecipeDetailSheet } from '@/components/cooking/KitchenRecipeDetailSheet';
import { KitchenFeedSkeleton } from '@/components/cooking/KitchenFeedSkeleton';
import GuidedCookingSession from '@/components/cooking/GuidedCookingSession';
import { appFont } from '@/constants/fonts';

const COLLECTIONS = [
  { id: 'discover', label: 'For you', icon: Sparkles },
  { id: 'quick', label: 'Quick', icon: Zap },
  { id: 'healthy', label: 'Healthy', icon: Leaf },
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'dinner', label: 'Dinner', icon: CookingPot },
  { id: 'african', label: 'African', icon: Globe2 },
  { id: 'english', label: 'British', icon: UtensilsCrossed },
  { id: 'vegetarian', label: 'Veggie', icon: Leaf },
] as const;

export default function CookingScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = useMemo(() => kitchenColors(isDark), [isDark]);
  const { bookmarks, bookmarkSet, toggleBookmark, recordCooked, cookCounts } = useCookingStorage();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState<string>('discover');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<KitchenRecipeDto | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<KitchenRecipeDto | null>(null);
  const [guidedVisible, setGuidedVisible] = useState(false);

  const {
    liveCatalog,
    bundle,
    bundleLoading,
    bundleError,
    searchResults,
    searchTotal,
    searchLoading,
    isSearching,
    loadRecipeDetail,
    loadingDetailId,
    refetchAll,
    recipeIndex,
  } = usePremiumKitchen({ searchQuery, activeCollection });

  const openRecipe = useCallback(
    async (recipe: KitchenRecipeDto) => {
      setSelectedRecipe(recipe);
      setDetailRecipe(recipe);
      const full = await loadRecipeDetail(recipe);
      setDetailRecipe((prev) =>
        prev && prev.id === full.id ? { ...full, image: full.image || prev.image } : full,
      );
    },
    [loadRecipeDetail],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  const showSearchResults = isSearching || (activeCollection !== 'discover' && !isSearching);
  const totalCooked = Object.values(cookCounts).reduce((a, b) => a + b, 0);

  const savedRecipesFromBundle = useMemo(() => {
    return bookmarks
      .map((id) => recipeIndex.get(id))
      .filter((r): r is KitchenRecipeDto => !!r);
  }, [bookmarks, recipeIndex]);

  return (
    <KeyboardAvoidingScreen>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <ChefHat size={22} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Kitchen</Text>
              <Text style={[styles.headerSub, { color: colors.muted }]}>
                {liveCatalog ? 'What shall we cook tonight?' : 'Classic & regional recipes'}
              </Text>
            </View>
          </View>

          <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={18} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search ingredients or dishes…"
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
                <X size={16} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {COLLECTIONS.map((c) => {
              const active = activeCollection === c.id;
              const Icon = c.icon;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? colors.accent : colors.card,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCollection(c.id);
                    if (c.id === 'discover') setSearchQuery('');
                  }}
                >
                  <Icon size={14} color={active ? '#FFF' : colors.accent} />
                  <Text style={[styles.pillText, { color: active ? '#FFF' : colors.text }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {bundleError ? (
            <FeedRetryBanner message="Couldn’t load live recipes." onRetry={() => void refetchAll()} />
          ) : null}

          <View style={styles.stats}>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Bookmark size={18} color="#007AFF" />
                <Text style={[styles.statNum, { color: colors.text }]}>{bookmarks.length}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Saved</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Flame size={18} color={colors.accent} />
                <Text style={[styles.statNum, { color: colors.text }]}>{totalCooked}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Cooked</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Sparkles size={18} color={colors.accent} />
                <Text style={[styles.statNum, { color: colors.text }]}>{liveCatalog ? '500k+' : '30+'}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Library</Text>
              </View>
            </View>

          {showSearchResults ? (
            <View style={styles.section}>
              <Text style={[styles.sectionHead, { color: colors.text }]}>
                {isSearching ? `Results for “${searchQuery.trim()}”` : COLLECTIONS.find((c) => c.id === activeCollection)?.label}
              </Text>
              <Text style={[styles.sectionSub, { color: colors.muted }]}>
                {searchLoading ? 'Searching…' : `${searchTotal.toLocaleString()} matches`}
              </Text>
              <View style={styles.grid}>
                {searchResults.map((recipe) => (
                  <View key={recipe.id} style={styles.gridItem}>
                    <PremiumRecipeTile
                      recipe={recipe}
                      saved={bookmarkSet.has(recipe.id)}
                      colors={colors}
                      compact
                      onPress={() => void openRecipe(recipe)}
                      onToggleSave={() => void toggleBookmark(recipe.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : bundleLoading ? (
            <KitchenFeedSkeleton colors={colors} />
          ) : bundle ? (
            <>
              <PremiumKitchenHero
                recipe={bundle.hero}
                saved={bookmarkSet.has(bundle.hero.id)}
                colors={colors}
                onPress={() => void openRecipe(bundle.hero)}
                onToggleSave={() => void toggleBookmark(bundle.hero.id)}
              />

              {savedRecipesFromBundle.length > 0 ? (
                <PremiumRecipeRail
                  title="Your saved"
                  subtitle="Recipes you’ve bookmarked"
                  recipes={savedRecipesFromBundle}
                  colors={colors}
                  savedIds={bookmarkSet}
                  onOpenRecipe={(r) => void openRecipe(r)}
                  onToggleSave={(id) => void toggleBookmark(id)}
                />
              ) : null}

              {bundle.collections.map((col) => (
                <PremiumRecipeRail
                  key={col.id}
                  title={col.title}
                  subtitle={col.subtitle}
                  recipes={col.recipes}
                  colors={colors}
                  savedIds={bookmarkSet}
                  onOpenRecipe={(r) => void openRecipe(r)}
                  onToggleSave={(id) => void toggleBookmark(id)}
                  onSeeAll={() => setActiveCollection(col.id)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>

        <KitchenRecipeDetailSheet
          visible={!!selectedRecipe}
          recipe={detailRecipe}
          loading={!!selectedRecipe && loadingDetailId === selectedRecipe.id}
          saved={selectedRecipe ? bookmarkSet.has(selectedRecipe.id) : false}
          isDark={isDark}
          colors={colors}
          onClose={() => {
            setSelectedRecipe(null);
            setDetailRecipe(null);
          }}
          onToggleSave={() => {
            if (selectedRecipe) void toggleBookmark(selectedRecipe.id);
          }}
          onStartGuided={() => {
            if (detailRecipe?.steps.length) setGuidedVisible(true);
          }}
          onMarkCooked={() => {
            if (selectedRecipe) void recordCooked(selectedRecipe.id);
          }}
        />

        <GuidedCookingSession
          visible={guidedVisible}
          recipe={detailRecipe ? kitchenDtoToGuidedRecipe(detailRecipe) : null}
          isDark={isDark}
          onClose={() => setGuidedVisible(false)}
          onCompleteCook={async () => {
            if (detailRecipe) await recordCooked(detailRecipe.id);
            setGuidedVisible(false);
          }}
        />
      </View>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { ...appFont('700', { display: true }), fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  headerSub: { ...appFont('400'), fontSize: 13, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { ...appFont('400'), flex: 1, fontSize: 16, paddingVertical: 0 },
  pills: { gap: 8, paddingRight: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { ...appFont('600'), fontSize: 13, fontWeight: '600' as const },
  stats: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20, marginTop: 4 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statNum: { ...appFont('700'), fontSize: 17, fontWeight: '700' as const },
  statLbl: { ...appFont('400'), fontSize: 11 },
  section: { paddingHorizontal: 20, marginTop: 8 },
  sectionHead: { ...appFont('700'), fontSize: 22, fontWeight: '700' as const },
  sectionSub: { ...appFont('400'), fontSize: 13, marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '47%' },
  empty: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { ...appFont('700'), fontSize: 18, fontWeight: '700' as const },
  emptyBody: { ...appFont('400'), fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
