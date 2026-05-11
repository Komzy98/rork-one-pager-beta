import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  Platform,
  Linking,
  TextInput,
  InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  Leaf,
  Clock3,
  Flame,
  BarChart3,
  Sparkles,
  Play,
  CheckCircle2,
  CalendarClock,
  ShoppingBag,
  Timer,
  Dumbbell,
  Heart,
  Soup,
  Bookmark,
  ChefHat,
  ChevronRight,
  X,
  ExternalLink,
  User,
  Search,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/hooks/useHabitsStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCookingStorage } from '@/hooks/useCookingStorage';
import {
  COOKING_RECIPES,
  QUICK_PICKS_META,
  type CookingRecipe,
  type QuickPickId,
} from '@/constants/cookingRecipes';
import {
  collectUserRecipeTags,
  countNutritionHabitCompletionsLast7Days,
  habitLooksNutritionRelated,
  pickTonightRecipe,
  scoreRecipeForUser,
  confidenceLabelFromCompletions,
} from '@/utils/cookingContext';
import { getStepTimerDefault, formatCountdown } from '@/utils/cookingTimers';
import GuidedCookingSession from '@/components/cooking/GuidedCookingSession';

/** Case-insensitive match across title, description, tags, ingredients, category. */
function recipeMatchesSearchQuery(recipe: CookingRecipe, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    recipe.title,
    recipe.description,
    recipe.category ?? '',
    recipe.difficulty,
    ...recipe.tags,
    ...recipe.ingredients,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

const GREEN = '#2E9A3F';
const ORANGE = '#FF9500';
const BLUE = '#007AFF';

function SectionHeader({
  title,
  textColor,
  mutedColor,
  onSeeAll,
}: {
  title: string;
  textColor: string;
  mutedColor: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      {onSeeAll ? (
        <TouchableOpacity style={styles.sectionAction} onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.sectionActionText}>See all</Text>
          <ChevronRight size={14} color={GREEN} />
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.35 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: mutedColor }}>Personalized</Text>
        </View>
      )}
    </View>
  );
}

function RecipeDetailSheet({
  visible,
  recipe,
  isBookmarked,
  onClose,
  onStartGuided,
  onToggleBookmark,
  onOpenShopping,
  isDark,
}: {
  visible: boolean;
  recipe: CookingRecipe | null;
  isBookmarked: boolean;
  onClose: () => void;
  onStartGuided: () => void;
  onToggleBookmark: () => void;
  onOpenShopping: () => void;
  isDark: boolean;
}) {
  const insets = useSafeAreaInsets();
  if (!recipe) return null;
  const card = isDark ? '#1D221E' : '#FFF';
  const border = isDark ? '#2D352E' : '#EBEEF1';
  const text = isDark ? '#F2F5F2' : '#101828';
  const muted = isDark ? '#A7B0A8' : '#667085';

  const openWeb = () => {
    const q = encodeURIComponent(`${recipe.title} recipe`);
    void Linking.openURL(`https://www.google.com/search?q=${q}`);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheetStyles.wrap, { paddingTop: insets.top, backgroundColor: isDark ? '#121412' : '#FAFBFA' }]}>
        <View style={[sheetStyles.header, { borderBottomColor: border }]}>
          <Text style={[sheetStyles.headerTitle, { color: text }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <TouchableOpacity onPress={onClose} style={[sheetStyles.iconBtn, { borderColor: border }]}>
            <X size={20} color={text} />
          </TouchableOpacity>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <Image
            source={{ uri: recipe.image }}
            style={sheetStyles.heroImg}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          <View style={{ paddingHorizontal: 18 }}>
            <View style={styles.heroBadgesWrap}>
              <View style={styles.badge}>
                <Clock3 size={12} color="#111" />
                <Text style={styles.badgeText}>{recipe.minutes} min</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{recipe.difficulty}</Text>
              </View>
            </View>
            <Text style={[sheetStyles.desc, { color: muted }]}>{recipe.description}</Text>

            <View
              style={[
                sheetStyles.nutritionCard,
                { backgroundColor: isDark ? '#161816' : '#F4F6F4', borderColor: border },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <BarChart3 size={14} color={GREEN} />
                <Text style={[sheetStyles.nutritionTitle, { color: text }]}>
                  Nutrition{recipe.servings != null ? ` · ~per serving (${recipe.servings} total)` : ' · ~per serving'}
                </Text>
              </View>
              <View style={sheetStyles.nutritionRow}>
                <View style={sheetStyles.nutritionItem}>
                  <Flame size={14} color={ORANGE} />
                  <Text style={[sheetStyles.nutritionVal, { color: text }]}>{recipe.nutrition.calories}</Text>
                  <Text style={[sheetStyles.nutritionLbl, { color: muted }]}>kcal</Text>
                </View>
                <View style={sheetStyles.nutritionItem}>
                  <Dumbbell size={14} color={GREEN} />
                  <Text style={[sheetStyles.nutritionVal, { color: text }]}>{recipe.nutrition.protein}g</Text>
                  <Text style={[sheetStyles.nutritionLbl, { color: muted }]}>protein</Text>
                </View>
                <View style={sheetStyles.nutritionItem}>
                  <Soup size={14} color={BLUE} />
                  <Text style={[sheetStyles.nutritionVal, { color: text }]}>{recipe.nutrition.carbs}g</Text>
                  <Text style={[sheetStyles.nutritionLbl, { color: muted }]}>carbs</Text>
                </View>
                <View style={sheetStyles.nutritionItem}>
                  <Leaf size={14} color={GREEN} />
                  <Text style={[sheetStyles.nutritionVal, { color: text }]}>{recipe.nutrition.fat}g</Text>
                  <Text style={[sheetStyles.nutritionLbl, { color: muted }]}>fat</Text>
                </View>
              </View>
            </View>

            <Text style={[sheetStyles.h2, { color: text }]}>Ingredients</Text>
            {recipe.ingredients.map((line, i) => (
              <Text key={i} style={[sheetStyles.line, { color: text }]}>
                • {line}
              </Text>
            ))}

            <Text style={[sheetStyles.h2, { color: text, marginTop: 16 }]}>Steps</Text>
            {recipe.steps.map((step, i) => {
              const sec = getStepTimerDefault(recipe, i);
              return (
                <View key={i} style={{ marginTop: i === 0 ? 6 : 10 }}>
                  <Text style={[sheetStyles.step, { color: text }]}>
                    {i + 1}. {step}
                  </Text>
                  {sec != null ? (
                    <View style={sheetStyles.stepTimerRow}>
                      <Timer size={12} color={GREEN} />
                      <Text style={[sheetStyles.stepTimerText, { color: muted }]}>
                        Suggested countdown {formatCountdown(sec)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <TouchableOpacity
                style={[sheetStyles.primaryBtn, { flex: 1, minWidth: 140 }]}
                onPress={onStartGuided}
                activeOpacity={0.85}
              >
                <ChefHat size={18} color="#FFF" />
                <Text style={sheetStyles.primaryBtnText}>Cook step-by-step</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sheetStyles.secondaryBtn, { borderColor: border, backgroundColor: card }]}
                onPress={onOpenShopping}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Open shopping list"
              >
                <ShoppingBag size={18} color={GREEN} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[sheetStyles.secondaryBtn, { borderColor: border, backgroundColor: card }]}
                onPress={onToggleBookmark}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Save recipe'}
              >
                <Bookmark size={18} color={isBookmarked ? ORANGE : text} fill={isBookmarked ? ORANGE : 'transparent'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[sheetStyles.secondaryBtn, { borderColor: border, backgroundColor: card }]}
                onPress={openWeb}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Search recipe on the web"
              >
                <ExternalLink size={18} color={BLUE} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ShoppingListModal({
  visible,
  recipe,
  onClose,
  isDark,
}: {
  visible: boolean;
  recipe: CookingRecipe | null;
  onClose: () => void;
  isDark: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  React.useEffect(() => {
    if (visible && recipe) setChecked({});
  }, [visible, recipe?.id]);

  if (!recipe) return null;
  const text = isDark ? '#F2F5F2' : '#101828';
  const muted = isDark ? '#A7B0A8' : '#667085';
  const card = isDark ? '#1D221E' : '#FFF';
  const border = isDark ? '#2D352E' : '#EBEEF1';
  const done = recipe.ingredients.filter((_, i) => checked[i]).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheetStyles.wrap, { paddingTop: insets.top, backgroundColor: isDark ? '#121412' : '#FAFBFA' }]}>
        <View style={[sheetStyles.header, { borderBottomColor: border }]}>
          <Text style={[sheetStyles.headerTitle, { color: text }]}>Shopping list</Text>
          <TouchableOpacity onPress={onClose} style={[sheetStyles.iconBtn, { borderColor: border }]}>
            <X size={20} color={text} />
          </TouchableOpacity>
        </View>
        <Text style={{ paddingHorizontal: 18, color: muted, marginBottom: 8 }}>
          {recipe.title} · {done}/{recipe.ingredients.length} checked
        </Text>
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={recipe.ingredients.map((label, index) => ({ label, index }))}
          keyExtractor={(it) => `${it.index}`}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            const isOn = !!checked[item.index];
            return (
              <Pressable
                onPress={() => setChecked((prev) => ({ ...prev, [item.index]: !isOn }))}
                style={[shopStyles.row, { borderColor: border, backgroundColor: card }]}
              >
                <View style={[shopStyles.tick, { borderColor: isOn ? GREEN : border, backgroundColor: isOn ? '#EEF8EF' : 'transparent' }]}>
                  {isOn ? <CheckCircle2 size={16} color={GREEN} /> : null}
                </View>
                <Text style={[shopStyles.label, { color: text, textDecorationLine: isOn ? 'line-through' : 'none' }]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

export default function CookingScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ diet?: string; habitName?: string; dietLabel?: string }>();
  const router = useRouter();
  const app = useApp();
  const { profile } = useUserProfile();
  const habits = app?.habits ?? [];
  const {
    toggleBookmark,
    recordCooked,
    isBookmarked,
    cookCountLabel,
    bookmarks,
  } = useCookingStorage();

  const [activeQuickPick, setActiveQuickPick] = useState<QuickPickId>('q1');
  const [detailRecipe, setDetailRecipe] = useState<CookingRecipe | null>(null);
  const [guidedRecipe, setGuidedRecipe] = useState<CookingRecipe | null>(null);
  const [shoppingRecipe, setShoppingRecipe] = useState<CookingRecipe | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');

  const routeDiet = typeof params.diet === 'string' ? params.diet : undefined;
  const routeHabitName = typeof params.habitName === 'string' ? params.habitName : undefined;
  const routeDietLabel = typeof params.dietLabel === 'string' ? params.dietLabel : undefined;

  const userTags = useMemo(
    () => collectUserRecipeTags(profile, habits, routeDiet),
    [profile, habits, routeDiet],
  );

  const nutritionHabits = useMemo(() => habits.filter(habitLooksNutritionRelated), [habits]);
  const completions7 = useMemo(() => countNutritionHabitCompletionsLast7Days(habits), [habits]);
  const confidence = useMemo(() => confidenceLabelFromCompletions(completions7), [completions7]);

  const quickFilter = useMemo(
    () => QUICK_PICKS_META.find((q) => q.id === activeQuickPick)?.filter ?? ((_r: CookingRecipe) => true),
    [activeQuickPick],
  );

  const filteredRecipes = useMemo(() => COOKING_RECIPES.filter(quickFilter), [quickFilter]);

  const visibleRecipes = useMemo(() => {
    const q = recipeSearchQuery.trim();
    if (!q) return filteredRecipes;
    return filteredRecipes.filter((r) => recipeMatchesSearchQuery(r, q));
  }, [filteredRecipes, recipeSearchQuery]);

  const tonightPick = useMemo(() => {
    const pool = filteredRecipes.length > 0 ? filteredRecipes : COOKING_RECIPES;
    return pickTonightRecipe(pool, userTags, routeDiet);
  }, [filteredRecipes, userTags, routeDiet]);

  const suggestPick = useMemo(() => {
    const pool = filteredRecipes.length > 0 ? filteredRecipes : COOKING_RECIPES;
    const sorted = [...pool].sort(
      (a, b) =>
        scoreRecipeForUser(b, userTags, routeDiet) - scoreRecipeForUser(a, userTags, routeDiet) ||
        a.title.localeCompare(b.title),
    );
    return sorted.find((r) => r.id !== tonightPick.id) ?? sorted[1] ?? sorted[0];
  }, [filteredRecipes, userTags, routeDiet, tonightPick.id]);

  const bookmarkedRecipes = useMemo(
    () => COOKING_RECIPES.filter((r) => bookmarks.includes(r.id)),
    [bookmarks],
  );

  const modeSubtitle = useMemo(() => {
    if (routeHabitName?.trim()) return `Linked to “${routeHabitName.trim()}”`;
    if (nutritionHabits[0]) return `Tuned from ${nutritionHabits.length} nutrition habit${nutritionHabits.length > 1 ? 's' : ''}`;
    const nat = profile?.nationalities?.[0]?.name;
    if (nat) return `Flavours inspired by ${nat}`;
    return 'Meal ideas matched to your profile';
  }, [routeHabitName, nutritionHabits, profile?.nationalities]);

  const goalPrimary = useMemo(() => {
    if (routeDietLabel?.trim()) return routeDietLabel.trim();
    const dh = nutritionHabits.find((h) => h.dietLabel?.trim());
    if (dh?.dietLabel) return dh.dietLabel;
    if (nutritionHabits[0]) return nutritionHabits[0].name;
    return 'Balanced meals';
  }, [routeDietLabel, nutritionHabits]);

  const bg = isDark ? '#121412' : '#FAFBFA';
  const cardBg = isDark ? '#1D221E' : '#FFFFFF';
  const border = isDark ? '#2D352E' : '#EBEEF1';
  const text = isDark ? '#F2F5F2' : '#101828';
  const muted = isDark ? '#A7B0A8' : '#667085';

  const haptic = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const hasFocusParams = Boolean(routeDiet?.trim() || routeDietLabel?.trim() || routeHabitName?.trim());

  const clearFocusParams = useCallback(() => {
    haptic();
    router.replace('/(tabs)/cooking' as any);
  }, [router]);

  const openProfile = () => {
    haptic();
    setSettingsOpen(false);
    router.push('/(tabs)/profile' as any);
  };

  const startGuidedFor = (r: CookingRecipe) => {
    setDetailRecipe(null);
    setGuidedRecipe(r);
  };

  /** Close other sheets first — stacking two pageSheet modals breaks taps on iOS/Android. */
  const openShoppingFor = useCallback((r: CookingRecipe) => {
    haptic();
    setDetailRecipe(null);
    setBrowseOpen(false);
    setSettingsOpen(false);
    InteractionManager.runAfterInteractions(() => {
      setShoppingRecipe(r);
    });
  }, []);

  const difficultyColor = (d: CookingRecipe['difficulty']) =>
    d === 'Easy' ? GREEN : d === 'Medium' ? ORANGE : '#FF3B30';

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
      >
        <View style={styles.homeHeader}>
          <View style={styles.homeHeaderRow}>
            <View style={styles.homeTitleBlock}>
              {profile?.firstName?.trim() ? (
                <Text style={[styles.homeGreeting, { color: muted }]}>Hi, {profile.firstName.trim()}</Text>
              ) : null}
              <Text style={[styles.homeTitle, { color: text }]}>Your kitchen</Text>
              <Text style={[styles.homeSubtitle, { color: muted }]} numberOfLines={3}>
                {modeSubtitle}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.circleIcon, { backgroundColor: cardBg, borderColor: border }]}
              onPress={() => {
                haptic();
                setSettingsOpen(true);
              }}
              activeOpacity={0.85}
              accessibilityLabel="Cooking settings"
            >
              <Settings size={20} color={text} />
            </TouchableOpacity>
          </View>
          {hasFocusParams ? (
            <View
              style={[
                styles.focusBanner,
                { backgroundColor: isDark ? '#1A261C' : '#EEF8EF', borderColor: isDark ? '#2D4A32' : '#C8E6C9' },
              ]}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Leaf size={16} color={GREEN} />
                <Text style={[styles.focusBannerText, { color: text }]} numberOfLines={1}>
                  Linked focus: {goalPrimary}
                </Text>
              </View>
              <TouchableOpacity onPress={clearFocusParams} hitSlop={12} accessibilityRole="button">
                <Text style={styles.focusBannerAction}>Reset</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={[styles.goalStrip, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.goalItem}>
            <Clock3 size={16} color={GREEN} />
            <View>
              <Text style={[styles.goalLabel, { color: muted }]}>Focus</Text>
              <Text style={[styles.goalValue, { color: text }]} numberOfLines={1}>
                {goalPrimary}
              </Text>
            </View>
          </View>
          <View style={[styles.goalDivider, { backgroundColor: border }]} />
          <View style={styles.goalItem}>
            <Flame size={16} color={ORANGE} />
            <View>
              <Text style={[styles.goalLabel, { color: muted }]}>7-day wins</Text>
              <Text style={[styles.goalValue, { color: text }]}>{completions7} logs</Text>
            </View>
          </View>
          <View style={[styles.goalDivider, { backgroundColor: border }]} />
          <View style={styles.goalItem}>
            <BarChart3 size={16} color={BLUE} />
            <View>
              <Text style={[styles.goalLabel, { color: muted }]}>Momentum</Text>
              <Text style={[styles.goalValue, { color: text }]} numberOfLines={1}>
                {confidence.label} · {confidence.pct}%
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: border }]}>
          <Image
            source={{ uri: tonightPick.image }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            priority="high"
          />
          <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <View style={styles.aiPill}>
              <Sparkles size={12} color={ORANGE} />
              <Text style={styles.aiPillText}>TOP PICK</Text>
            </View>
            <Text style={styles.heroTitle}>
              Tonight&apos;s{'\n'}
              <Text style={styles.heroTitleAccent}>Best match</Text>
            </Text>
            <Text style={styles.heroMeal}>{tonightPick.title}</Text>
            <Text style={styles.heroDesc}>{tonightPick.description}</Text>
          </View>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => {
              haptic();
              setDetailRecipe(tonightPick);
            }}
          >
            <Play size={22} color="#1A1A1A" fill="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.heroBottom}>
            <View style={styles.heroBadges}>
              <View style={styles.badge}>
                <Clock3 size={12} color="#111" />
                <Text style={styles.badgeText}>{tonightPick.minutes} min</Text>
              </View>
              <View style={styles.badge}>
                <Dumbbell size={12} color={ORANGE} />
                <Text style={styles.badgeText}>
                  {tonightPick.tags.includes('high-protein') ? 'High protein' : 'Balanced'}
                </Text>
              </View>
              <View style={styles.badge}>
                <Leaf size={12} color={GREEN} />
                <Text style={styles.badgeText}>
                  {tonightPick.tags.some((t) => /low-carb|keto/i.test(t)) ? 'Lower carb' : 'Fresh'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                haptic();
                startGuidedFor(tonightPick);
              }}
            >
              <Text style={styles.startBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.whyStrip, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.whyItem}>
            <CheckCircle2 size={16} color={GREEN} />
            <Text style={[styles.whyText, { color: text }]}>Ranked using your habits & interests</Text>
          </View>
          <View style={styles.whyItem}>
            <CalendarClock size={16} color={BLUE} />
            <Text style={[styles.whyText, { color: text }]}>Filters respect your current quick pick</Text>
          </View>
          <View style={styles.whyItem}>
            <ShoppingBag size={16} color={ORANGE} />
            <Text style={[styles.whyText, { color: text }]}>Shopping lists from real ingredient lines</Text>
          </View>
        </View>

        <SectionHeader title="Quick picks" textColor={text} mutedColor={muted} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowPad}>
          {QUICK_PICKS_META.map(({ id, label }) => {
            const Icon =
              id === 'q1' ? Timer : id === 'q2' ? Leaf : id === 'q3' ? Dumbbell : id === 'q4' ? Soup : Heart;
            const active = activeQuickPick === id;
            const chipBg = active ? (isDark ? '#1A2E1C' : '#EEF8EF') : cardBg;
            const chipBorder = active ? '#A7D8AD' : border;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => {
                  haptic();
                  setActiveQuickPick(id);
                }}
                style={[styles.quickChip, { backgroundColor: chipBg, borderColor: chipBorder }]}
                activeOpacity={0.85}
              >
                <Icon size={14} color={id === 'q2' ? GREEN : id === 'q3' ? BLUE : id === 'q5' ? '#FF3B30' : ORANGE} />
                <Text style={[styles.quickText, { color: text }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.searchWrap, { marginHorizontal: 18 }]}>
          <View style={[styles.searchInner, { backgroundColor: cardBg, borderColor: border }]}>
            <Search size={18} color={muted} style={{ opacity: 0.85 }} />
            <TextInput
              value={recipeSearchQuery}
              onChangeText={setRecipeSearchQuery}
              placeholder="Search recipes, ingredients…"
              placeholderTextColor={muted}
              style={[styles.searchInput, { color: text }]}
              returnKeyType="search"
              autoCorrect
              autoCapitalize="none"
              clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
              accessibilityLabel="Search recipes"
            />
            {recipeSearchQuery.length > 0 && Platform.OS !== 'ios' ? (
              <TouchableOpacity
                onPress={() => {
                  haptic();
                  setRecipeSearchQuery('');
                }}
                hitSlop={12}
                accessibilityLabel="Clear search"
              >
                <X size={18} color={muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          {recipeSearchQuery.trim().length > 0 ? (
            <Text style={[styles.searchHint, { color: muted }]}>
              {visibleRecipes.length} match{visibleRecipes.length === 1 ? '' : 'es'} for “{recipeSearchQuery.trim()}”
            </Text>
          ) : null}
        </View>

        <SectionHeader
          title={activeQuickPick === 'q1' ? 'Under 20 minutes' : 'Recipes for you'}
          textColor={text}
          mutedColor={muted}
          onSeeAll={() => {
            haptic();
            setBrowseOpen(true);
          }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowPad}>
          {visibleRecipes.map((meal) => (
            <View key={meal.id} style={[styles.mealCard, { backgroundColor: cardBg, borderColor: border }]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  haptic();
                  setDetailRecipe(meal);
                }}
              >
                <Image
                  source={{ uri: meal.image }}
                  style={styles.mealImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
                <View style={styles.cookedTag}>
                  <Text style={styles.cookedTagText}>{cookCountLabel(meal.id)}</Text>
                </View>
                <View style={styles.mealBody}>
                  <Text style={[styles.mealTitle, { color: text }]} numberOfLines={2}>
                    {meal.title}
                  </Text>
                  <Text style={[styles.mealMeta, { color: muted }]}>
                    {meal.minutes} min · <Text style={{ color: difficultyColor(meal.difficulty) }}>{meal.difficulty}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bookmarkBtn}
                onPress={() => {
                  haptic();
                  void toggleBookmark(meal.id);
                }}
              >
                <Bookmark size={14} color="#111" fill={isBookmarked(meal.id) ? ORANGE : 'transparent'} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        {recipeSearchQuery.trim().length > 0 && visibleRecipes.length === 0 ? (
          <Text style={[styles.searchEmpty, { color: muted, marginHorizontal: 18 }]}>
            No recipes match that search. Try another word or clear filters with the quick picks above.
          </Text>
        ) : null}

        {bookmarkedRecipes.length > 0 ? (
          <>
            <SectionHeader title="Saved" textColor={text} mutedColor={muted} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowPad}>
              {bookmarkedRecipes.map((meal) => (
                <TouchableOpacity
                  key={`bm-${meal.id}`}
                  style={[styles.mealCard, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() => {
                    haptic();
                    setDetailRecipe(meal);
                  }}
                >
                  <Image
                    source={{ uri: meal.image }}
                    style={styles.mealImage}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.mealBody}>
                    <Text style={[styles.mealTitle, { color: text }]} numberOfLines={2}>
                      {meal.title}
                    </Text>
                    <Text style={[styles.mealMeta, { color: muted }]}>{meal.minutes} min</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionHeader title="One Pager suggests" textColor={text} mutedColor={muted} />
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            haptic();
            setDetailRecipe(suggestPick);
          }}
          style={[styles.suggestCard, { backgroundColor: cardBg, borderColor: border }]}
        >
          <Image
            source={{ uri: suggestPick.image }}
            style={styles.suggestImage}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
          <View style={styles.suggestBody}>
            <Text style={styles.tryText}>Try something different</Text>
            <Text style={[styles.suggestTitle, { color: text }]}>{suggestPick.title}</Text>
            <Text style={[styles.suggestMeta, { color: muted }]} numberOfLines={2}>
              {suggestPick.tags.slice(0, 3).join(' · ')} · {suggestPick.minutes} min
            </Text>
          </View>
          <View style={[styles.viewRecipeBtn, { borderColor: '#9CD2A4' }]}>
            <Text style={styles.viewRecipeText}>View</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ingredientsStrip, { backgroundColor: cardBg, borderColor: border }]}
          onPress={() => openShoppingFor(tonightPick)}
          activeOpacity={0.88}
        >
          <View style={styles.ingredientsLeft}>
            <View style={styles.ingredientsIconWrap}>
              <ShoppingBag size={18} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ingredientsTitle, { color: text }]}>
                Shop for <Text style={{ color: GREEN }}>{tonightPick.title}</Text>
              </Text>
              <Text style={[styles.ingredientsSub, { color: muted }]}>{tonightPick.ingredients.length} ingredients · tap to check off</Text>
            </View>
          </View>
          <ChevronRight size={18} color={muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaWrap}
          onPress={() => {
            haptic();
            startGuidedFor(tonightPick);
          }}
          activeOpacity={0.92}
        >
          <LinearGradient colors={['#74C85B', '#3DAA3E']} style={styles.cta}>
            <View style={styles.ctaIcon}>
              <ChefHat size={18} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Guided cooking</Text>
              <Text style={styles.ctaSub}>Step-by-step for tonight&apos;s pick</Text>
            </View>
            <ChevronRight size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <RecipeDetailSheet
        visible={!!detailRecipe}
        recipe={detailRecipe}
        isBookmarked={detailRecipe ? isBookmarked(detailRecipe.id) : false}
        onClose={() => setDetailRecipe(null)}
        onStartGuided={() => detailRecipe && startGuidedFor(detailRecipe)}
        onToggleBookmark={() => detailRecipe && void toggleBookmark(detailRecipe.id)}
        onOpenShopping={() => detailRecipe && openShoppingFor(detailRecipe)}
        isDark={isDark}
      />

      <GuidedCookingSession
        visible={!!guidedRecipe}
        recipe={guidedRecipe}
        isDark={isDark}
        onClose={() => setGuidedRecipe(null)}
        onCompleteCook={async () => {
          if (guidedRecipe) await recordCooked(guidedRecipe.id);
        }}
      />

      <ShoppingListModal visible={!!shoppingRecipe} recipe={shoppingRecipe} onClose={() => setShoppingRecipe(null)} isDark={isDark} />

      <Modal visible={settingsOpen} animationType="fade" transparent>
        <Pressable style={settingsStyles.backdrop} onPress={() => setSettingsOpen(false)}>
          <Pressable style={[settingsStyles.sheet, { backgroundColor: cardBg, borderColor: border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[settingsStyles.title, { color: text }]}>Cooking</Text>
            <Text style={[settingsStyles.body, { color: muted }]}>
              This tab blends your nutrition habits, saved community diet programs, nationalities, and interests — no extra signup.
            </Text>
            <TouchableOpacity style={settingsStyles.rowBtn} onPress={openProfile}>
              <User size={18} color={GREEN} />
              <Text style={[settingsStyles.rowBtnText, { color: text }]}>Edit profile & tab order</Text>
              <ChevronRight size={18} color={muted} />
            </TouchableOpacity>
            {hasFocusParams ? (
              <TouchableOpacity style={settingsStyles.rowBtn} onPress={clearFocusParams}>
                <Leaf size={18} color={GREEN} />
                <Text style={[settingsStyles.rowBtnText, { color: text }]}>Clear habit / diet link</Text>
                <ChevronRight size={18} color={muted} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[settingsStyles.closeFull, { borderColor: border }]} onPress={() => setSettingsOpen(false)}>
              <Text style={{ color: text, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={browseOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBrowseOpen(false)}>
        <View style={[sheetStyles.wrap, { paddingTop: insets.top, backgroundColor: bg }]}>
          <View style={[sheetStyles.header, { borderBottomColor: border }]}>
            <Text style={[sheetStyles.headerTitle, { color: text }]}>All matches</Text>
            <TouchableOpacity onPress={() => setBrowseOpen(false)} style={[sheetStyles.iconBtn, { borderColor: border }]}>
              <X size={20} color={text} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={[styles.searchInner, { backgroundColor: cardBg, borderColor: border }]}>
              <Search size={18} color={muted} style={{ opacity: 0.85 }} />
              <TextInput
                value={recipeSearchQuery}
                onChangeText={setRecipeSearchQuery}
                placeholder="Search in this list…"
                placeholderTextColor={muted}
                style={[styles.searchInput, { color: text }]}
                returnKeyType="search"
                autoCorrect
                autoCapitalize="none"
                clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
              />
              {recipeSearchQuery.length > 0 && Platform.OS !== 'ios' ? (
                <TouchableOpacity onPress={() => setRecipeSearchQuery('')} hitSlop={12}>
                  <X size={18} color={muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <FlatList
            data={visibleRecipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <Text style={{ color: muted, textAlign: 'center', paddingTop: 24, fontSize: 14 }}>
                {recipeSearchQuery.trim()
                  ? `No recipes match “${recipeSearchQuery.trim()}”. Try a different search.`
                  : 'No recipes in this quick pick. Choose another filter above.'}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[browseStyles.row, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => {
                  setBrowseOpen(false);
                  setDetailRecipe(item);
                }}
              >
                <Image
                  source={{ uri: item.image }}
                  style={browseStyles.thumb}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: text, fontWeight: '800', fontSize: 15 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={{ color: muted, marginTop: 4, fontSize: 12 }}>
                    {item.minutes} min · {item.difficulty}
                  </Text>
                </View>
                <ChevronRight size={18} color={muted} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  homeHeader: { paddingHorizontal: 18, paddingBottom: 4 },
  homeHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  homeTitleBlock: { flex: 1, paddingRight: 12 },
  homeGreeting: { fontSize: 15, fontWeight: '600' as const, marginBottom: 4 },
  homeTitle: { fontSize: 32, fontWeight: '900' as const, letterSpacing: -0.8, lineHeight: 36 },
  homeSubtitle: { marginTop: 8, fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  focusBanner: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  focusBannerText: { fontSize: 13, fontWeight: '700' as const, flex: 1 },
  focusBannerAction: { fontSize: 13, fontWeight: '800' as const, color: GREEN },
  circleIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  goalStrip: { marginTop: 16, marginHorizontal: 18, borderRadius: 14, borderWidth: 1, flexDirection: 'row', paddingVertical: 10 },
  goalItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  goalDivider: { width: 1, marginVertical: 4 },
  goalLabel: { fontSize: 10 },
  goalValue: { fontSize: 11, fontWeight: '700' as const },
  heroCard: { marginTop: 14, marginHorizontal: 18, borderRadius: 16, borderWidth: 1, overflow: 'hidden', height: 255 },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroBody: { padding: 14, width: '78%' },
  aiPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  aiPillText: { fontSize: 10, fontWeight: '800' as const, color: '#222' },
  heroTitle: { marginTop: 10, color: '#FFFFFF', fontSize: 28, lineHeight: 30, fontWeight: '900' as const },
  heroTitleAccent: { color: '#8DFF87' },
  heroMeal: { marginTop: 8, color: '#FFF', fontSize: 16, fontWeight: '800' as const },
  heroDesc: { marginTop: 4, color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 16 },
  playBtn: { position: 'absolute', right: 22, top: 88, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  heroBottom: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  heroBadgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 10, color: '#111', fontWeight: '700' as const },
  startBtn: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#5DBB50', justifyContent: 'center' },
  startBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' as const },
  whyStrip: { marginTop: 12, marginHorizontal: 18, borderRadius: 14, borderWidth: 1, padding: 10, gap: 8 },
  whyItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whyText: { fontSize: 12, fontWeight: '600' as const, flex: 1 },
  sectionHeader: { marginTop: 16, marginBottom: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '900' as const },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { color: GREEN, fontSize: 13, fontWeight: '800' as const },
  rowPad: { paddingHorizontal: 18, gap: 8 },
  quickChip: { height: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickText: { fontSize: 11, fontWeight: '700' as const },
  searchWrap: { marginTop: 10, marginBottom: 4 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600' as const, paddingVertical: Platform.OS === 'android' ? 4 : 0 },
  searchHint: { marginTop: 8, fontSize: 12, fontWeight: '600' as const },
  searchEmpty: { marginTop: 8, marginBottom: 4, fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  mealCard: { width: 150, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  mealImage: { width: '100%', height: 96 },
  cookedTag: { position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  cookedTagText: { fontSize: 9, fontWeight: '800' as const, color: '#101828' },
  bookmarkBtn: { position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  mealBody: { padding: 10 },
  mealTitle: { fontSize: 13, fontWeight: '800' as const, minHeight: 32 },
  mealMeta: { marginTop: 4, fontSize: 10, fontWeight: '600' as const },
  suggestCard: { marginHorizontal: 18, borderRadius: 14, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestImage: { width: 64, height: 64, borderRadius: 10 },
  suggestBody: { flex: 1 },
  tryText: { color: ORANGE, fontSize: 10, fontWeight: '800' as const },
  suggestTitle: { marginTop: 2, fontSize: 14, fontWeight: '800' as const },
  suggestMeta: { marginTop: 2, fontSize: 11, fontWeight: '500' as const },
  viewRecipeBtn: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  viewRecipeText: { color: GREEN, fontSize: 11, fontWeight: '800' as const },
  ingredientsStrip: { marginTop: 14, marginHorizontal: 18, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ingredientsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  ingredientsIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF8EF', alignItems: 'center', justifyContent: 'center' },
  ingredientsTitle: { fontSize: 12, fontWeight: '800' as const },
  ingredientsSub: { marginTop: 1, fontSize: 10 },
  ctaWrap: { marginHorizontal: 18, marginTop: 14 },
  cta: { height: 58, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { color: '#FFF', fontSize: 15, fontWeight: '900' as const },
  ctaSub: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '600' as const },
});

const sheetStyles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', flex: 1, marginRight: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroImg: { width: '100%', height: 200, backgroundColor: '#222' },
  desc: { marginTop: 12, fontSize: 14, lineHeight: 20 },
  nutritionCard: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 14 },
  nutritionTitle: { fontSize: 12, fontWeight: '800' as const },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  nutritionItem: { flex: 1, alignItems: 'center', gap: 4 },
  nutritionVal: { fontSize: 16, fontWeight: '800' as const },
  nutritionLbl: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
  h2: { marginTop: 18, fontSize: 16, fontWeight: '800' },
  line: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  step: { fontSize: 14, lineHeight: 21, fontWeight: '600' as const },
  stepTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 2 },
  stepTimerText: { fontSize: 12, fontWeight: '600' as const },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14 },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  secondaryBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

const shopStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  tick: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
});

const settingsStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 20, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '900' },
  body: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  rowBtn: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowBtnText: { flex: 1, fontSize: 16, fontWeight: '700' },
  closeFull: { marginTop: 16, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});

const browseStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: 10 },
});
