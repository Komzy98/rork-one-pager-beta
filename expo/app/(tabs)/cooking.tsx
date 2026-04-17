import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  RefreshControl,
  Image,
} from 'react-native';
import {
  Search,
  Clock,
  Flame,
  Heart,
  BookOpen,
  Star,
  Users,
  Timer,
  X,
  UtensilsCrossed,
  Salad,
  CookingPot,
  Cake,
  Leaf,
  Zap,
  Coffee,
  Apple,
  ClipboardList,
  Tag,
  ChefHat,
  Lightbulb,
  Bookmark,
  Trophy,
  Check,
  Minus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';



interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  cookTime: string;
  prepTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: number;
  category: string;
  tags: string[];
  image: string;
  rating: number;
  isFavourite: boolean;
  ingredients: string[];
  steps: string[];
}

interface MealPlanItem {
  id: string;
  meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  recipe: string;
  time: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  completed: boolean;
}

const RECIPE_CATEGORIES: { id: string; label: string; icon: React.ComponentType<any>; iconColor: string }[] = [
  { id: 'all', label: 'All', icon: UtensilsCrossed, iconColor: '#E8603C' },
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, iconColor: '#F59E0B' },
  { id: 'lunch', label: 'Lunch', icon: Salad, iconColor: '#34C759' },
  { id: 'dinner', label: 'Dinner', icon: CookingPot, iconColor: '#FF6347' },
  { id: 'dessert', label: 'Dessert', icon: Cake, iconColor: '#FF69B4' },
  { id: 'healthy', label: 'Healthy', icon: Leaf, iconColor: '#30D158' },
  { id: 'quick', label: 'Quick', icon: Zap, iconColor: '#FF9500' },
  { id: 'vegetarian', label: 'Veggie', icon: Leaf, iconColor: '#34C759' },
];

const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Creamy Tuscan Chicken',
    subtitle: 'Rich & flavourful one-pan dish',
    cookTime: '25 min',
    prepTime: '10 min',
    servings: 4,
    difficulty: 'Easy',
    calories: 420,
    category: 'dinner',
    tags: ['one-pan', 'protein', 'italian'],
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600',
    rating: 4.8,
    isFavourite: true,
    ingredients: ['Chicken breast', 'Sun-dried tomatoes', 'Spinach', 'Garlic', 'Heavy cream', 'Parmesan'],
    steps: ['Season chicken', 'Sear in pan', 'Add garlic & tomatoes', 'Pour cream & simmer', 'Add spinach & parmesan'],
  },
  {
    id: '2',
    title: 'Avocado Toast Deluxe',
    subtitle: 'Elevated brunch classic',
    cookTime: '5 min',
    prepTime: '10 min',
    servings: 2,
    difficulty: 'Easy',
    calories: 310,
    category: 'breakfast',
    tags: ['quick', 'healthy', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600',
    rating: 4.5,
    isFavourite: false,
    ingredients: ['Sourdough bread', 'Avocado', 'Cherry tomatoes', 'Feta cheese', 'Chilli flakes', 'Lemon'],
    steps: ['Toast bread', 'Mash avocado with lemon', 'Spread on toast', 'Top with tomatoes & feta', 'Sprinkle chilli flakes'],
  },
  {
    id: '3',
    title: 'Thai Green Curry',
    subtitle: 'Aromatic coconut curry',
    cookTime: '30 min',
    prepTime: '15 min',
    servings: 4,
    difficulty: 'Medium',
    calories: 380,
    category: 'dinner',
    tags: ['spicy', 'thai', 'curry'],
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600',
    rating: 4.7,
    isFavourite: true,
    ingredients: ['Green curry paste', 'Coconut milk', 'Chicken thigh', 'Thai basil', 'Bamboo shoots', 'Fish sauce'],
    steps: ['Fry curry paste', 'Add coconut milk', 'Add chicken', 'Simmer 20 min', 'Add basil & serve'],
  },
  {
    id: '4',
    title: 'Berry Smoothie Bowl',
    subtitle: 'Refreshing & nutritious',
    cookTime: '0 min',
    prepTime: '10 min',
    servings: 1,
    difficulty: 'Easy',
    calories: 280,
    category: 'breakfast',
    tags: ['healthy', 'quick', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600',
    rating: 4.6,
    isFavourite: false,
    ingredients: ['Mixed berries', 'Banana', 'Greek yoghurt', 'Granola', 'Chia seeds', 'Honey'],
    steps: ['Blend berries & banana', 'Pour into bowl', 'Top with granola', 'Add chia seeds & honey'],
  },
  {
    id: '5',
    title: 'Lemon Herb Salmon',
    subtitle: 'Light & zesty fillet',
    cookTime: '15 min',
    prepTime: '10 min',
    servings: 2,
    difficulty: 'Easy',
    calories: 350,
    category: 'healthy',
    tags: ['fish', 'healthy', 'protein'],
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600',
    rating: 4.9,
    isFavourite: true,
    ingredients: [
      { name: 'Salmon fillet', amount: 2, unit: 'fillets' },
      { name: 'Lemon', amount: 1, unit: 'whole' },
      { name: 'Fresh dill', amount: 2, unit: 'tbsp' },
      { name: 'Garlic cloves', amount: 2, unit: 'cloves' },
      { name: 'Olive oil', amount: 2, unit: 'tbsp' },
      { name: 'Asparagus', amount: 250, unit: 'g' },
      { name: 'Sea salt', amount: 0.5, unit: 'tsp' },
      { name: 'Black pepper', amount: 0.25, unit: 'tsp' },
    ],
    steps: ['Preheat oven to 200\u00B0C / 400\u00B0F', 'Season salmon with salt, pepper, minced garlic & dill', 'Place on lined tray with asparagus, drizzle olive oil', 'Top with lemon slices, bake 12-15 min', 'Squeeze fresh lemon juice before serving'],
  },
  {
    id: '6',
    title: 'Chocolate Lava Cake',
    subtitle: 'Indulgent molten centre',
    cookTime: '12 min',
    prepTime: '15 min',
    servings: 2,
    difficulty: 'Medium',
    calories: 490,
    category: 'dessert',
    tags: ['chocolate', 'dessert', 'indulgent'],
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600',
    rating: 4.9,
    isFavourite: false,
    ingredients: ['Dark chocolate', 'Butter', 'Eggs', 'Sugar', 'Flour', 'Vanilla extract'],
    steps: ['Melt chocolate & butter', 'Whisk eggs & sugar', 'Fold together', 'Pour into ramekins', 'Bake 12 min'],
  },
  {
    id: '7',
    title: 'Mediterranean Quinoa Bowl',
    subtitle: 'Colourful & wholesome',
    cookTime: '15 min',
    prepTime: '10 min',
    servings: 2,
    difficulty: 'Easy',
    calories: 340,
    category: 'lunch',
    tags: ['healthy', 'vegetarian', 'meal-prep'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    rating: 4.5,
    isFavourite: false,
    ingredients: ['Quinoa', 'Cucumber', 'Cherry tomatoes', 'Kalamata olives', 'Feta', 'Hummus'],
    steps: ['Cook quinoa', 'Chop vegetables', 'Assemble bowl', 'Add hummus & feta', 'Drizzle olive oil'],
  },
  {
    id: '8',
    title: 'Spicy Prawn Tacos',
    subtitle: 'Loaded with fresh salsa',
    cookTime: '10 min',
    prepTime: '15 min',
    servings: 3,
    difficulty: 'Easy',
    calories: 360,
    category: 'dinner',
    tags: ['mexican', 'seafood', 'quick'],
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
    rating: 4.7,
    isFavourite: false,
    ingredients: ['King prawns', 'Corn tortillas', 'Lime', 'Coriander', 'Jalape\u00F1o', 'Red cabbage'],
    steps: ['Season & cook prawns', 'Make mango salsa', 'Warm tortillas', 'Assemble tacos', 'Squeeze lime & serve'],
  },
];

const TODAYS_MEAL_PLAN: MealPlanItem[] = [
  { id: '1', meal: 'Breakfast', recipe: 'Berry Smoothie Bowl', time: '8:00', icon: Coffee, iconColor: '#F59E0B', completed: true },
  { id: '2', meal: 'Lunch', recipe: 'Mediterranean Quinoa Bowl', time: '12:30', icon: Salad, iconColor: '#34C759', completed: false },
  { id: '3', meal: 'Snack', recipe: 'Apple & Almond Butter', time: '15:30', icon: Apple, iconColor: '#FF3B30', completed: false },
  { id: '4', meal: 'Dinner', recipe: 'Creamy Tuscan Chicken', time: '19:00', icon: CookingPot, iconColor: '#FF6347', completed: false },
];

const QUICK_STATS: { label: string; value: string; icon: React.ComponentType<any>; iconColor: string }[] = [
  { label: 'Recipes Saved', value: '24', icon: Bookmark, iconColor: '#007AFF' },
  { label: 'Cooked This Week', value: '5', icon: Flame, iconColor: '#FF6347' },
  { label: 'Streak', value: '12 days', icon: Trophy, iconColor: '#FFD700' },
];

const IMPERIAL_CONVERSIONS: Record<string, { unit: string; factor: number; round?: number }> = {
  g: { unit: 'oz', factor: 0.03527396, round: 0.1 },
  ml: { unit: 'fl oz', factor: 0.033814, round: 0.1 },
  tbsp: { unit: 'tbsp', factor: 1 },
  tsp: { unit: 'tsp', factor: 1 },
};

const formatAmount = (num: number): string => {
  if (num === 0.25) return '¼';
  if (num === 0.5) return '½';
  if (num === 0.75) return '¾';
  if (num === 0.33 || Math.abs(num - 1 / 3) < 0.01) return '⅓';
  if (num === 0.67 || Math.abs(num - 2 / 3) < 0.01) return '⅔';
  if (Number.isInteger(num)) return num.toString();
  const rounded = Math.round(num * 10) / 10;
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toFixed(1);
};

const formatIngredient = (ing: Ingredient, multiplier: number, system: 'metric' | 'imperial'): string => {
  const scaledAmount = ing.amount * multiplier;
  const conv = IMPERIAL_CONVERSIONS[ing.unit];
  if (system === 'imperial' && conv && conv.factor !== 1) {
    const converted = scaledAmount * conv.factor;
    return `${formatAmount(converted)} ${conv.unit}`;
  }
  const unitLabel = ing.unit === 'whole' ? '' : ing.unit;
  const amount = formatAmount(scaledAmount);
  return unitLabel ? `${amount} ${unitLabel}` : amount;
};

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'Easy': return '#34C759';
    case 'Medium': return '#FF9500';
    case 'Hard': return '#FF3B30';
    default: return '#8E8E93';
  }
};

export default function CookingScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>(TODAYS_MEAL_PLAN);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [servingOverrides, setServingOverrides] = useState<Record<string, number>>({});
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerScale, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [headerScale]);

  const filteredRecipes = useMemo(() => {
    let filtered = recipes;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory || r.tags.includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some(t => t.includes(q)) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [recipes, selectedCategory, searchQuery]);

  const favouriteRecipes = useMemo(() => recipes.filter(r => r.isFavourite), [recipes]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const toggleFavourite = useCallback((recipeId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecipes(prev => prev.map(r =>
      r.id === recipeId ? { ...r, isFavourite: !r.isFavourite } : r
    ));
  }, []);

  const adjustServings = useCallback((recipeId: string, baseServings: number, delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setServingOverrides(prev => {
      const current = prev[recipeId] ?? baseServings;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [recipeId]: next };
    });
  }, []);

  const toggleMealComplete = useCallback((mealId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMealPlan(prev => prev.map(m =>
      m.id === mealId ? { ...m, completed: !m.completed } : m
    ));
  }, []);

  const completedMeals = useMemo(() => mealPlan.filter(m => m.completed).length, [mealPlan]);
  const mealProgress = completedMeals / mealPlan.length;

  const accentColor = '#E8603C';
  const accentLight = '#FFF0EB';

  const warmBg = isDark ? '#1A1210' : '#FDF8F5';
  const cardBg = isDark ? '#2A2220' : '#FFFFFF';
  const cardBorder = isDark ? '#3A302E' : '#F0E8E4';
  const subtleText = isDark ? '#A09490' : '#8C7E78';
  const mainText = isDark ? '#F5EDE8' : '#2C1E16';
  const secondaryBg = isDark ? '#221A18' : '#FAF3EF';

  return (
    <View style={[styles.container, { backgroundColor: warmBg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Animated.View style={[styles.headerContent, { transform: [{ scale: headerScale }] }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconWrap, { backgroundColor: isDark ? '#2A2220' : accentLight }]}>
              <ChefHat size={22} color={accentColor} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: mainText }]}>Kitchen</Text>
              <Text style={[styles.headerSubtitle, { color: subtleText }]}>What shall we cook today?</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.headerAction, { backgroundColor: isDark ? '#2A2220' : accentLight }]}
            onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <BookOpen size={20} color={accentColor} />
          </TouchableOpacity>
        </Animated.View>

        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Search size={18} color={subtleText} />
          <TextInput
            style={[styles.searchInput, { color: mainText }]}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor={subtleText}
            value={searchQuery}
            onChangeText={setSearchQuery}

          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={subtleText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentColor} />
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={styles.statsRow}>
          {QUICK_STATS.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <stat.icon size={22} color={stat.iconColor} />
              <Text style={[styles.statValue, { color: mainText }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: subtleText }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ClipboardList size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: mainText }]}>Today's Meal Plan</Text>
            </View>
            <View style={[styles.progressPill, { backgroundColor: isDark ? '#2A2220' : accentLight }]}>
              <Text style={[styles.progressText, { color: accentColor }]}>
                {completedMeals}/{mealPlan.length}
              </Text>
            </View>
          </View>

          <View style={[styles.progressBarBg, { backgroundColor: cardBorder }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: accentColor,
                  width: `${mealProgress * 100}%` as any,
                },
              ]}
            />
          </View>

          {mealPlan.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.mealItem, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => toggleMealComplete(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.mealIconWrap, { backgroundColor: item.completed ? (isDark ? '#1A2E1A' : '#E8F8E8') : secondaryBg }]}>
                <item.icon size={18} color={item.completed ? '#34C759' : item.iconColor} />
              </View>
              <View style={styles.mealInfo}>
                <Text style={[styles.mealType, { color: subtleText }]}>{item.meal}</Text>
                <Text style={[
                  styles.mealRecipe,
                  { color: mainText },
                  item.completed && styles.mealCompleted,
                ]}>{item.recipe}</Text>
              </View>
              <View style={styles.mealRight}>
                <Text style={[styles.mealTime, { color: subtleText }]}>{item.time}</Text>
                <View style={[
                  styles.checkCircle,
                  {
                    backgroundColor: item.completed ? '#34C759' : 'transparent',
                    borderColor: item.completed ? '#34C759' : cardBorder,
                  },
                ]}>
                  {item.completed && <Check size={13} color="#fff" />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Tag size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: mainText }]}>Categories</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {RECIPE_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive ? accentColor : cardBg,
                      borderColor: isActive ? accentColor : cardBorder,
                    },
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id);
                  }}
                  activeOpacity={0.7}
                >
                  <cat.icon size={16} color={isActive ? '#FFFFFF' : cat.iconColor} />
                  <Text style={[styles.categoryLabel, { color: isActive ? '#FFFFFF' : mainText }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {favouriteRecipes.length > 0 && selectedCategory === 'all' && !searchQuery && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Heart size={18} color="#FF3B30" />
                <Text style={[styles.sectionTitle, { color: mainText }]}>Favourites</Text>
              </View>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: accentColor }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favouritesScroll}>
              {favouriteRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={[styles.favouriteCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: recipe.image }} style={styles.favouriteImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.favouriteGradient}
                  />
                  <View style={styles.favouriteOverlay}>
                    <Text style={styles.favouriteTitle} numberOfLines={1}>{recipe.title}</Text>
                    <View style={styles.favouriteMeta}>
                      <Clock size={12} color="#FFF" />
                      <Text style={styles.favouriteMetaText}>{recipe.cookTime}</Text>
                      <View style={styles.favouriteDot} />
                      <Star size={12} color="#FFD700" />
                      <Text style={styles.favouriteMetaText}>{recipe.rating}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.favouriteHeart}
                    onPress={() => toggleFavourite(recipe.id)}
                  >
                    <Heart size={16} color="#FF3B30" fill="#FF3B30" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <UtensilsCrossed size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: mainText }]}>
                {selectedCategory === 'all' ? 'All Recipes' : RECIPE_CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Recipes'}
              </Text>
            </View>
            <Text style={[styles.resultCount, { color: subtleText }]}>{filteredRecipes.length} recipes</Text>
          </View>

          {filteredRecipes.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Search size={32} color={subtleText} />
              <Text style={[styles.emptyTitle, { color: mainText }]}>No recipes found</Text>
              <Text style={[styles.emptyText, { color: subtleText }]}>Try a different search or category</Text>
            </View>
          ) : (
            filteredRecipes.map((recipe) => {
              const isExpanded = expandedRecipe === recipe.id;
              return (
                <TouchableOpacity
                  key={recipe.id}
                  style={[styles.recipeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedRecipe(isExpanded ? null : recipe.id);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.recipeRow}>
                    <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
                    <View style={styles.recipeInfo}>
                      <View style={styles.recipeTop}>
                        <Text style={[styles.recipeTitle, { color: mainText }]} numberOfLines={1}>{recipe.title}</Text>
                        <TouchableOpacity onPress={() => toggleFavourite(recipe.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Heart size={18} color={recipe.isFavourite ? '#FF3B30' : subtleText} fill={recipe.isFavourite ? '#FF3B30' : 'transparent'} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.recipeSubtitle, { color: subtleText }]} numberOfLines={1}>{recipe.subtitle}</Text>
                      <View style={styles.recipeMeta}>
                        <View style={styles.recipeMetaItem}>
                          <Clock size={13} color={subtleText} />
                          <Text style={[styles.recipeMetaText, { color: subtleText }]}>{recipe.cookTime}</Text>
                        </View>
                        <View style={[styles.recipeDiffBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) + '20' }]}>
                          <Text style={[styles.recipeDiffText, { color: getDifficultyColor(recipe.difficulty) }]}>{recipe.difficulty}</Text>
                        </View>
                        <View style={styles.recipeMetaItem}>
                          <Flame size={13} color={subtleText} />
                          <Text style={[styles.recipeMetaText, { color: subtleText }]}>{recipe.calories} kcal</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {isExpanded && (() => {
                    const currentServings = servingOverrides[recipe.id] ?? recipe.servings;
                    const multiplier = currentServings / recipe.servings;
                    return (
                    <View style={[styles.expandedContent, { borderTopColor: cardBorder }]}>
                      <View style={[styles.servingsPanel, { backgroundColor: secondaryBg, borderColor: cardBorder }]}>
                        <View style={styles.servingsLeft}>
                          <Users size={16} color={accentColor} />
                          <View>
                            <Text style={[styles.servingsLabel, { color: subtleText }]}>Servings</Text>
                            <Text style={[styles.servingsValue, { color: mainText }]}>{currentServings}</Text>
                          </View>
                        </View>
                        <View style={styles.servingsControls}>
                          <TouchableOpacity
                            style={[styles.servingBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            onPress={(e) => { e.stopPropagation(); adjustServings(recipe.id, recipe.servings, -1); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Minus size={16} color={mainText} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.servingBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            onPress={(e) => { e.stopPropagation(); adjustServings(recipe.id, recipe.servings, 1); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Plus size={16} color={mainText} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.unitToggle, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setUnitSystem(s => s === 'metric' ? 'imperial' : 'metric');
                            }}
                          >
                            <Scale size={13} color={accentColor} />
                            <Text style={[styles.unitToggleText, { color: accentColor }]}>{unitSystem === 'metric' ? 'Metric' : 'Imperial'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.expandedSection}>
                        <Text style={[styles.expandedLabel, { color: accentColor }]}>Ingredients</Text>
                        <View style={styles.ingredientsColumn}>
                          {recipe.ingredients.map((ing, i) => (
                            <View key={i} style={[styles.ingredientRow, { borderBottomColor: cardBorder }]}>
                              <View style={[styles.ingredientBullet, { backgroundColor: accentColor }]} />
                              <Text style={[styles.ingredientName, { color: mainText }]}>{ing.name}</Text>
                              <View style={[styles.amountBadge, { backgroundColor: accentLight }]}>
                                <Text style={[styles.amountBadgeText, { color: accentColor }]}>{formatIngredient(ing, multiplier, unitSystem)}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                      <View style={styles.expandedSection}>
                        <Text style={[styles.expandedLabel, { color: accentColor }]}>Steps</Text>
                        {recipe.steps.map((step, i) => (
                          <View key={i} style={styles.stepRow}>
                            <View style={[styles.stepNumber, { backgroundColor: accentColor }]}>
                              <Text style={styles.stepNumberText}>{i + 1}</Text>
                            </View>
                            <Text style={[styles.stepText, { color: mainText }]}>{step}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.recipeDetailsRow}>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <Timer size={14} color={subtleText} />
                          <Text style={[styles.detailText, { color: mainText }]}>Prep: {recipe.prepTime}</Text>
                        </View>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <Clock size={14} color={subtleText} />
                          <Text style={[styles.detailText, { color: mainText }]}>Cook: {recipe.cookTime}</Text>
                        </View>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <Star size={14} color="#FFD700" />
                          <Text style={[styles.detailText, { color: mainText }]}>{recipe.rating}</Text>
                        </View>
                      </View>
                    </View>
                    );
                  })()}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={[styles.tipCard, { backgroundColor: isDark ? '#2A261A' : '#FFF8E8' }]}>
            <View style={styles.tipIconWrap}>
              <Lightbulb size={20} color="#F59E0B" />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: mainText }]}>Cooking Tip of the Day</Text>
              <Text style={[styles.tipText, { color: subtleText }]}>
                Rest your meat for 5-10 minutes after cooking. This allows the juices to redistribute, resulting in a more flavourful and tender bite.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  resultCount: {
    fontSize: 13,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  mealIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mealType: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  mealRecipe: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  mealCompleted: {
    textDecorationLine: 'line-through' as const,
    opacity: 0.5,
  },
  mealRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  favouritesScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  favouriteCard: {
    width: 180,
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  favouriteImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  favouriteGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  favouriteOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
  },
  favouriteTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  favouriteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  favouriteMetaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  favouriteDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  favouriteHeart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  recipeRow: {
    flexDirection: 'row',
    padding: 12,
  },
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  recipeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
    marginRight: 8,
  },
  recipeSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  recipeDiffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recipeDiffText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 14,
  },
  expandedSection: {
    marginBottom: 14,
  },
  expandedLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ingredientText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  servingsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  servingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingsLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servingBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    marginLeft: 4,
  },
  unitToggleText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  ingredientsColumn: {
    gap: 0,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  amountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  amountBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  recipeDetailsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    marginHorizontal: 20,
    padding: 40,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
