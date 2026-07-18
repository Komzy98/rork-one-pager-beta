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
  Platform,
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { KeyboardAvoidingScreen } from '@/components/KeyboardAvoidingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCookingStorage } from '@/hooks/useCookingStorage';
import { useAuth } from '@/hooks/useAuth';
import { appFont } from '@/constants/fonts';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  ingredients: string[];
  steps: string[];
}

interface MealPlanItem {
  id: string;
  meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  recipe: string;
  recipeId: string;
  time: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  completed: boolean;
  fromFavourite: boolean;
}

type StoredMealPlanEntry = {
  id: string;
  meal: MealPlanItem['meal'];
  recipeId: string;
  recipe: string;
  fromFavourite: boolean;
};

type MealSlotConfig = {
  meal: MealPlanItem['meal'];
  time: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  matches: (recipe: Recipe) => boolean;
};

const MEAL_SLOTS: MealSlotConfig[] = [
  {
    meal: 'Breakfast',
    time: '8:00',
    icon: Coffee,
    iconColor: '#F59E0B',
    matches: (r) => r.category === 'breakfast',
  },
  {
    meal: 'Lunch',
    time: '12:30',
    icon: Salad,
    iconColor: '#34C759',
    matches: (r) => r.category === 'lunch',
  },
  {
    meal: 'Snack',
    time: '15:30',
    icon: Apple,
    iconColor: '#FF3B30',
    matches: (r) => r.tags.includes('snack') || r.category === 'dessert',
  },
  {
    meal: 'Dinner',
    time: '19:00',
    icon: CookingPot,
    iconColor: '#FF6347',
    matches: (r) => r.category === 'dinner' || r.category === 'healthy',
  },
];

function pickForSlot(pool: Recipe[], seed: number): Recipe {
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[seed % sorted.length];
}

/** Build today's four meal slots — favourites first, library rotation as fallback. */
function buildTodaysMealPlan(
  bookmarkIds: readonly string[],
  dayOfYear: number,
): Omit<MealPlanItem, 'completed'>[] {
  const bookmarkSet = new Set(bookmarkIds);
  const favourites = ALL_RECIPES.filter((r) => bookmarkSet.has(r.id));
  const usedIds = new Set<string>();

  return MEAL_SLOTS.map((slot, slotIndex) => {
    const favMatches = favourites.filter((r) => slot.matches(r) && !usedIds.has(r.id));
    const libMatches = ALL_RECIPES.filter((r) => slot.matches(r) && !usedIds.has(r.id));
    const fromFavourite = favMatches.length > 0;
    const pool = fromFavourite ? favMatches : libMatches;
    const fallbackPool = ALL_RECIPES.filter((r) => !usedIds.has(r.id));
    const recipe =
      pool.length > 0
        ? pickForSlot(pool, dayOfYear + slotIndex)
        : pickForSlot(fallbackPool.length > 0 ? fallbackPool : ALL_RECIPES, dayOfYear + slotIndex);

    usedIds.add(recipe.id);

    return {
      id: `${slot.meal.toLowerCase()}-${recipe.id}`,
      meal: slot.meal,
      recipe: recipe.title,
      recipeId: recipe.id,
      time: slot.time,
      icon: slot.icon,
      iconColor: slot.iconColor,
      fromFavourite: fromFavourite && bookmarkSet.has(recipe.id),
    };
  });
}

function hydrateStoredMealPlan(stored: StoredMealPlanEntry[]): Omit<MealPlanItem, 'completed'>[] {
  return stored.map((entry) => {
    const slot = MEAL_SLOTS.find((s) => s.meal === entry.meal) ?? MEAL_SLOTS[0];
    const recipe = ALL_RECIPES.find((r) => r.id === entry.recipeId);
    return {
      id: entry.id,
      meal: entry.meal,
      recipe: recipe?.title ?? entry.recipe,
      recipeId: entry.recipeId,
      time: slot.time,
      icon: slot.icon,
      iconColor: slot.iconColor,
      fromFavourite: entry.fromFavourite,
    };
  });
}

function serializeMealPlan(items: readonly Omit<MealPlanItem, 'completed'>[]): StoredMealPlanEntry[] {
  return items.map(({ id, meal, recipeId, recipe, fromFavourite }) => ({
    id,
    meal,
    recipeId,
  recipe,
    fromFavourite,
  }));
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const RECIPE_CATEGORIES: { id: string; label: string; icon: React.ComponentType<any>; iconColor: string }[] = [
  { id: 'all', label: 'All', icon: UtensilsCrossed, iconColor: '#E8603C' },
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, iconColor: '#F59E0B' },
  { id: 'lunch', label: 'Lunch', icon: Salad, iconColor: '#34C759' },
  { id: 'dinner', label: 'Dinner', icon: CookingPot, iconColor: '#FF6347' },
  { id: 'dessert', label: 'Dessert', icon: Cake, iconColor: '#FF69B4' },
  { id: 'healthy', label: 'Healthy', icon: Leaf, iconColor: '#30D158' },
  { id: 'quick', label: 'Quick', icon: Zap, iconColor: '#FF9500' },
  { id: 'vegetarian', label: 'Veggie', icon: Leaf, iconColor: '#34C759' },
  { id: 'nigerian', label: 'Nigerian', icon: CookingPot, iconColor: '#008751' },
  { id: 'english', label: 'English', icon: UtensilsCrossed, iconColor: '#C8102E' },
];

const ALL_RECIPES: Recipe[] = [
  // ── Western classics ──────────────────────────────────────────────────────
  {
    id: 'creamy-tuscan-chicken',
    title: 'Creamy Tuscan Chicken',
    subtitle: 'Rich & flavourful one-pan dish',
    cookTime: '25 min', prepTime: '10 min', servings: 4,
    difficulty: 'Easy', calories: 420, category: 'dinner',
    tags: ['one-pan', 'protein', 'italian'],
    image: 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=700&q=80',
    rating: 4.8,
    ingredients: ['Chicken breast', 'Sun-dried tomatoes', 'Spinach', 'Garlic', 'Heavy cream', 'Parmesan'],
    steps: ['Season chicken', 'Sear in pan', 'Add garlic & tomatoes', 'Pour cream & simmer', 'Add spinach & parmesan'],
  },
  {
    id: 'avocado-toast',
    title: 'Avocado Toast Deluxe',
    subtitle: 'Elevated brunch classic',
    cookTime: '5 min', prepTime: '10 min', servings: 2,
    difficulty: 'Easy', calories: 310, category: 'breakfast',
    tags: ['quick', 'healthy', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=700&q=80',
    rating: 4.5,
    ingredients: ['Sourdough bread', 'Avocado', 'Cherry tomatoes', 'Feta cheese', 'Chilli flakes', 'Lemon'],
    steps: ['Toast bread', 'Mash avocado with lemon', 'Spread on toast', 'Top with tomatoes & feta', 'Sprinkle chilli flakes'],
  },
  {
    id: 'thai-green-curry',
    title: 'Thai Green Curry',
    subtitle: 'Aromatic coconut curry',
    cookTime: '30 min', prepTime: '15 min', servings: 4,
    difficulty: 'Medium', calories: 380, category: 'dinner',
    tags: ['spicy', 'thai', 'curry'],
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=700&q=80',
    rating: 4.7,
    ingredients: ['Green curry paste', 'Coconut milk', 'Chicken thigh', 'Thai basil', 'Bamboo shoots', 'Fish sauce'],
    steps: ['Fry curry paste', 'Add coconut milk', 'Add chicken', 'Simmer 20 min', 'Add basil & serve'],
  },
  {
    id: 'berry-smoothie-bowl',
    title: 'Berry Smoothie Bowl',
    subtitle: 'Refreshing & nutritious',
    cookTime: '0 min', prepTime: '10 min', servings: 1,
    difficulty: 'Easy', calories: 280, category: 'breakfast',
    tags: ['healthy', 'quick', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=700&q=80',
    rating: 4.6,
    ingredients: ['Mixed berries', 'Banana', 'Greek yoghurt', 'Granola', 'Chia seeds', 'Honey'],
    steps: ['Blend berries & banana', 'Pour into bowl', 'Top with granola', 'Add chia seeds & honey'],
  },
  {
    id: 'lemon-herb-salmon',
    title: 'Lemon Herb Salmon',
    subtitle: 'Light & zesty fillet',
    cookTime: '15 min', prepTime: '10 min', servings: 2,
    difficulty: 'Easy', calories: 350, category: 'healthy',
    tags: ['fish', 'healthy', 'protein'],
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=700&q=80',
    rating: 4.9,
    ingredients: ['Salmon fillet', 'Lemon', 'Fresh dill', 'Garlic', 'Olive oil', 'Asparagus'],
    steps: ['Preheat oven to 200°C', 'Season salmon', 'Place on baking tray', 'Bake 12–15 min', 'Serve with asparagus'],
  },
  {
    id: 'chocolate-lava-cake',
    title: 'Chocolate Lava Cake',
    subtitle: 'Indulgent molten centre',
    cookTime: '12 min', prepTime: '15 min', servings: 2,
    difficulty: 'Medium', calories: 490, category: 'dessert',
    tags: ['chocolate', 'dessert', 'indulgent'],
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=700&q=80',
    rating: 4.9,
    ingredients: ['Dark chocolate', 'Butter', 'Eggs', 'Sugar', 'Flour', 'Vanilla extract'],
    steps: ['Melt chocolate & butter', 'Whisk eggs & sugar', 'Fold together', 'Pour into ramekins', 'Bake 12 min'],
  },
  {
    id: 'mediterranean-quinoa-bowl',
    title: 'Mediterranean Quinoa Bowl',
    subtitle: 'Colourful & wholesome',
    cookTime: '15 min', prepTime: '10 min', servings: 2,
    difficulty: 'Easy', calories: 340, category: 'lunch',
    tags: ['healthy', 'vegetarian', 'meal-prep'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80',
    rating: 4.5,
    ingredients: ['Quinoa', 'Cucumber', 'Cherry tomatoes', 'Kalamata olives', 'Feta', 'Hummus'],
    steps: ['Cook quinoa', 'Chop vegetables', 'Assemble bowl', 'Add hummus & feta', 'Drizzle olive oil'],
  },
  {
    id: 'spicy-prawn-tacos',
    title: 'Spicy Prawn Tacos',
    subtitle: 'Loaded with fresh salsa',
    cookTime: '10 min', prepTime: '15 min', servings: 3,
    difficulty: 'Easy', calories: 360, category: 'dinner',
    tags: ['mexican', 'seafood', 'quick'],
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=700&q=80',
    rating: 4.7,
    ingredients: ['King prawns', 'Corn tortillas', 'Lime', 'Coriander', 'Jalapeño', 'Red cabbage'],
    steps: ['Season & cook prawns', 'Make mango salsa', 'Warm tortillas', 'Assemble tacos', 'Squeeze lime & serve'],
  },

  // ── English & British ───────────────────────────────────────────────────────
  {
    id: 'full-english-breakfast',
    title: 'Full English Breakfast',
    subtitle: 'The classic fry-up — eggs, bacon, beans & more',
    cookTime: '25 min', prepTime: '10 min', servings: 2,
    difficulty: 'Easy', calories: 720, category: 'breakfast',
    tags: ['english', 'british', 'comfort', 'protein'],
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80',
    rating: 4.8,
    ingredients: [
      'Back bacon rashers',
      'Eggs',
      'Baked beans',
      'Cumberland or pork sausages',
      'Button mushrooms',
      'Grilled tomatoes',
      'Toast or fried bread',
      'Black pudding (optional)',
    ],
    steps: [
      'Grill or fry bacon and sausages until golden',
      'Sauté mushrooms and halved tomatoes in the same pan',
      'Warm baked beans in a small pot',
      'Fry or poach eggs to your liking',
      'Plate everything together with hot buttered toast',
    ],
  },
  {
    id: 'fish-and-chips',
    title: 'Fish & Chips',
    subtitle: 'Beer-battered cod with proper chips',
    cookTime: '30 min', prepTime: '15 min', servings: 4,
    difficulty: 'Medium', calories: 680, category: 'dinner',
    tags: ['english', 'british', 'fish', 'comfort', 'feast'],
    image: 'https://images.unsplash.com/photo-1579202673508-ba3c99fd4de6?w=700&q=80',
    rating: 4.9,
    ingredients: [
      'Cod or haddock fillets',
      'Maris Piper potatoes',
      'Plain flour',
      'Baking powder',
      'Cold lager or sparkling water',
      'Malt vinegar',
      'Mushy peas',
      'Sea salt',
    ],
    steps: [
      'Cut potatoes into thick chips; soak, dry and double-fry until crisp',
      'Whisk flour, baking powder and cold beer to a smooth batter',
      'Dust fish in flour, dip in batter and fry until golden and cooked through',
      'Drain on a rack; season chips generously with salt',
      'Serve with malt vinegar and mushy peas',
    ],
  },
  {
    id: 'shepherds-pie',
    title: "Shepherd's Pie",
    subtitle: 'Lamb mince under creamy mashed potato',
    cookTime: '45 min', prepTime: '20 min', servings: 5,
    difficulty: 'Medium', calories: 520, category: 'dinner',
    tags: ['english', 'british', 'comfort', 'bake'],
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=700&q=80',
    rating: 4.8,
    ingredients: [
      'Lamb mince 500g',
      'Onion, carrot, celery',
      'Tomato purée',
      'Worcestershire sauce',
      'Beef stock',
      'Thyme, rosemary',
      'Mashed potato with butter and milk',
      'Cheddar for topping',
    ],
    steps: [
      'Brown lamb with vegetables; drain excess fat',
      'Stir in tomato purée, Worcestershire and stock; simmer 20 min',
      'Season well and transfer to a baking dish',
      'Spread creamy mash over the top; fork ridges for crisp edges',
      'Bake at 200°C until bubbling and golden, about 25 min',
    ],
  },
  {
    id: 'bangers-and-mash',
    title: 'Bangers & Mash',
    subtitle: 'Sausages, mash and onion gravy',
    cookTime: '30 min', prepTime: '10 min', servings: 4,
    difficulty: 'Easy', calories: 580, category: 'dinner',
    tags: ['english', 'british', 'comfort', 'quick'],
    image: 'https://images.unsplash.com/photo-1606755962773-d324e166a853?w=700&q=80',
    rating: 4.7,
    ingredients: [
      'Pork sausages',
      'Potatoes',
      'Butter, milk',
      'Onions',
      'Beef stock',
      'Flour',
      'Peas',
    ],
    steps: [
      'Boil potatoes until tender; mash with butter and milk',
      'Fry sausages slowly until browned and cooked through',
      'Caramelise sliced onions; add flour then stock for gravy',
      'Simmer gravy until thick and glossy',
      'Serve sausages on mash with gravy and peas',
    ],
  },
  {
    id: 'sunday-roast-beef',
    title: 'Sunday Roast Beef',
    subtitle: 'Roast sirloin with Yorkshires & gravy',
    cookTime: '90 min', prepTime: '20 min', servings: 6,
    difficulty: 'Hard', calories: 640, category: 'dinner',
    tags: ['english', 'british', 'roast', 'feast', 'protein'],
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=700&q=80',
    rating: 4.9,
    ingredients: [
      'Beef roasting joint (sirloin or rib)',
      'Yorkshire pudding batter',
      'Roast potatoes',
      'Carrots, parsnips',
      'Red wine or beef stock for gravy',
      'Fresh horseradish',
      'Thyme, garlic',
    ],
    steps: [
      'Bring beef to room temp; season and sear all over',
      'Roast at 200°C then reduce; rest 20 min before carving',
      'Roast potatoes and root veg in beef fat',
      'Bake Yorkshire puddings in hot oil until risen and crisp',
      'Make gravy from pan juices; carve and serve family-style',
    ],
  },
  {
    id: 'chicken-tikka-masala',
    title: 'Chicken Tikka Masala',
    subtitle: 'Britain\'s favourite curry — creamy tomato sauce',
    cookTime: '40 min', prepTime: '25 min', servings: 4,
    difficulty: 'Medium', calories: 510, category: 'dinner',
    tags: ['english', 'british', 'curry', 'comfort', 'protein'],
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700&q=80',
    rating: 4.8,
    ingredients: [
      'Chicken breast',
      'Yoghurt, garam masala, turmeric',
      'Tomato passata',
      'Double cream',
      'Ginger, garlic, onion',
      'Kasuri methi',
      'Basmati rice',
      'Naan bread',
    ],
    steps: [
      'Marinate chicken in yoghurt and spices; grill or char in a pan',
      'Fry onion, ginger and garlic; add spices',
      'Add passata and simmer; stir in cream',
      'Return chicken to sauce and simmer 10 min',
      'Finish with kasuri methi; serve with rice and naan',
    ],
  },
  {
    id: 'steak-and-ale-pie',
    title: 'Steak & Ale Pie',
    subtitle: 'Rich beef stew under golden pastry',
    cookTime: '120 min', prepTime: '25 min', servings: 6,
    difficulty: 'Hard', calories: 590, category: 'dinner',
    tags: ['english', 'british', 'pie', 'comfort', 'feast'],
    image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=700&q=80',
    rating: 4.8,
    ingredients: [
      'Stewing beef',
      'Brown ale or stout',
      'Onion, carrot',
      'Beef stock',
      'Thyme, bay leaves',
      'Plain flour',
      'Shortcrust or puff pastry',
      'Egg wash',
    ],
    steps: [
      'Brown beef in batches; soften onion and carrot',
      'Add flour, ale and stock; braise low and slow 1.5–2 hours',
      'Cool filling slightly; transfer to a pie dish',
      'Top with pastry, crimp edges and cut a steam hole',
      'Bake at 200°C until pastry is deep golden',
    ],
  },
  {
    id: 'toad-in-the-hole',
    title: 'Toad in the Hole',
    subtitle: 'Yorkshire batter baked with sausages',
    cookTime: '40 min', prepTime: '10 min', servings: 4,
    difficulty: 'Easy', calories: 540, category: 'dinner',
    tags: ['english', 'british', 'comfort', 'bake'],
    image: 'https://images.unsplash.com/photo-1604908176997-4316357b0e1f?w=700&q=80',
    rating: 4.6,
    ingredients: [
      'Pork sausages',
      'Plain flour',
      'Eggs',
      'Milk',
      'Vegetable oil',
      'Onion gravy',
      'Peas or greens',
    ],
    steps: [
      'Whisk flour, eggs and milk to a smooth batter; rest 30 min',
      'Heat oil in a roasting tin at 220°C until smoking',
      'Add sausages and pour over batter quickly',
      'Bake 25–30 min without opening the door until risen and crisp',
      'Serve immediately with onion gravy and greens',
    ],
  },
  {
    id: 'cornish-pasty',
    title: 'Cornish Pasty',
    subtitle: 'Hand-held beef & potato pastry',
    cookTime: '45 min', prepTime: '25 min', servings: 4,
    difficulty: 'Medium', calories: 480, category: 'lunch',
    tags: ['english', 'british', 'pie', 'meal-prep'],
    image: 'https://images.unsplash.com/photo-1600891964595-f61ba0e40fab?w=700&q=80',
    rating: 4.7,
    ingredients: [
      'Shortcrust pastry',
      'Beef skirt or diced steak',
      'Potato, swede, onion',
      'Butter',
      'Salt, pepper',
      'Egg wash',
    ],
    steps: [
      'Dice beef and vegetables into small even pieces',
      'Roll pastry circles; pile filling on one half',
      'Dot with butter; season well',
      'Fold, crimp the edge tightly and brush with egg',
      'Bake at 180°C until golden, about 40 min',
    ],
  },
  {
    id: 'ploughmans-lunch',
    title: "Ploughman's Lunch",
    subtitle: 'Cheese, pickle, bread & cold cuts',
    cookTime: '0 min', prepTime: '15 min', servings: 2,
    difficulty: 'Easy', calories: 620, category: 'lunch',
    tags: ['english', 'british', 'quick', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&q=80',
    rating: 4.5,
    ingredients: [
      'Cheddar and Stilton',
      'Crusty bread',
      'Branston pickle or chutney',
      'Ham or pork pie',
      'Apple, celery sticks',
      'Butter, lettuce',
      'Pickled onions',
    ],
    steps: [
      'Slice cheeses and arrange at room temperature',
      'Cut bread and butter if serving warm',
      'Add pickle, ham and pork pie to the board',
      'Include apple wedges and celery for crunch',
      'Serve as a sharing platter with a pint or tea'],
  },
  {
    id: 'eton-mess',
    title: 'Eton Mess',
    subtitle: 'Strawberries, cream & crushed meringue',
    cookTime: '0 min', prepTime: '15 min', servings: 4,
    difficulty: 'Easy', calories: 320, category: 'dessert',
    tags: ['english', 'british', 'dessert', 'snack', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=700&q=80',
    rating: 4.8,
    ingredients: [
      'Fresh strawberries',
      'Double cream',
      'Icing sugar',
      'Ready-made meringue nests',
      'Vanilla extract',
      'Mint to garnish',
    ],
    steps: [
      'Hull and quarter strawberries; macerate with a little sugar',
      'Whip cream with icing sugar and vanilla to soft peaks',
      'Roughly crush meringue into bite-sized pieces',
      'Fold strawberries, cream and meringue together gently',
      'Serve immediately in glasses — do not assemble too far ahead',
    ],
  },
  {
    id: 'english-scones',
    title: 'English Scones',
    subtitle: 'Light scones for afternoon tea',
    cookTime: '15 min', prepTime: '15 min', servings: 8,
    difficulty: 'Easy', calories: 240, category: 'breakfast',
    tags: ['english', 'british', 'breakfast', 'snack', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=80',
    rating: 4.7,
    ingredients: [
      'Self-raising flour',
      'Cold butter',
      'Caster sugar',
      'Milk',
      'Clotted cream',
      'Strawberry jam',
      'Baking powder',
    ],
    steps: [
      'Rub cold butter into flour, sugar and baking powder',
      'Add milk to form a soft dough — handle minimally',
      'Pat out and cut rounds; brush tops with milk',
      'Bake at 220°C for 12–15 min until risen and golden',
      'Cool slightly; split and serve with jam and clotted cream',
    ],
  },
  {
    id: 'beef-wellington',
    title: 'Beef Wellington',
    subtitle: 'Fillet wrapped in mushroom duxelles & pastry',
    cookTime: '50 min', prepTime: '40 min', servings: 4,
    difficulty: 'Hard', calories: 710, category: 'dinner',
    tags: ['english', 'british', 'feast', 'protein'],
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700&q=80',
    rating: 4.9,
    ingredients: [
      'Beef fillet centre cut',
      'Mushroom duxelles',
      'Parma ham or prosciutto',
      'Puff pastry',
      'English mustard',
      'Egg wash',
      'Thyme',
    ],
    steps: [
      'Sear seasoned fillet on all sides; brush with mustard and cool',
      'Cook mushrooms until all moisture evaporates',
      'Wrap fillet in ham and duxelles, then tight in cling film; chill',
      'Encase in puff pastry, seal and egg wash',
      'Bake at 200°C until pastry is golden; rest before slicing',
    ],
  },
  {
    id: 'cottage-pie',
    title: 'Cottage Pie',
    subtitle: 'Beef mince bake with cheesy mash top',
    cookTime: '50 min', prepTime: '15 min', servings: 5,
    difficulty: 'Easy', calories: 495, category: 'dinner',
    tags: ['english', 'british', 'comfort', 'bake'],
    image: 'https://images.unsplash.com/photo-1604908177525-3cf4fd139d33?w=700&q=80',
    rating: 4.7,
    ingredients: [
      'Beef mince',
      'Onion, carrot, peas',
      'Tomato purée',
      'Worcestershire sauce',
      'Beef stock',
      'Mashed potato',
      'Grated cheddar',
    ],
    steps: [
      'Brown beef with onion and carrot',
      'Add purée, Worcestershire and stock; simmer until thick',
      'Stir in peas and season',
      'Top with mash and sprinkle cheddar',
      'Bake until golden and bubbling at the edges',
    ],
  },

  // ── Nigerian ───────────────────────────────────────────────────────────────
  {
    id: 'nigerian-jollof-rice',
    title: 'Nigerian Jollof Rice',
    subtitle: 'Smoky party rice — the crown jewel',
    cookTime: '50 min', prepTime: '20 min', servings: 6,
    difficulty: 'Medium', calories: 410, category: 'dinner',
    tags: ['nigerian', 'african', 'rice', 'comfort', 'feast'],
    image: 'https://images.unsplash.com/photo-1665556899022-9761f95769e5?w=700&q=80',
    rating: 4.9,
    ingredients: [
      '3 cups long-grain parboiled rice',
      '6 Roma tomatoes',
      '2 red bell peppers',
      '1 Scotch bonnet (atarodo)',
      '2 large onions',
      '1/3 cup vegetable oil',
      '2 tbsp tomato paste',
      'Chicken or beef stock',
      'Thyme, curry powder, bay leaves',
      'Knorr cubes, salt to taste',
    ],
    steps: [
      'Blend tomatoes, peppers, half an onion and scotch bonnet until smooth',
      'Fry remaining onion in oil until golden, add tomato paste and fry 3 min',
      'Pour in pepper blend and cook on medium-high 15–20 min until oil separates and base is deep red',
      'Add washed rice, stock, thyme, curry and bay leaves — liquid should sit 1 inch above rice',
      'Cover tightly, cook on low 25 min without stirring; rest 5 min then fluff',
    ],
  },
  {
    id: 'nigerian-egusi-soup',
    title: 'Egusi Soup',
    subtitle: 'Melon-seed stew with leafy greens',
    cookTime: '45 min', prepTime: '20 min', servings: 5,
    difficulty: 'Medium', calories: 520, category: 'dinner',
    tags: ['nigerian', 'african', 'soup', 'comfort'],
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80',
    rating: 4.8,
    ingredients: [
      '2 cups ground egusi (melon seeds)',
      'Assorted meat & stockfish',
      'Palm oil',
      'Bitterleaf or spinach',
      'Crayfish',
      'Scotch bonnet',
      'Onion, locust beans (iru)',
      'Seasoning cubes',
    ],
    steps: [
      'Boil assorted meat with onion, seasoning and stockfish until tender; reserve stock',
      'Heat palm oil, fry blended pepper and onion 8 min',
      'Stir in ground egusi — fry briefly without burning',
      'Add stock gradually to desired thickness; simmer 15 min',
      'Fold in washed bitterleaf or spinach; serve with swallow or rice',
    ],
  },
  {
    id: 'nigerian-suya',
    title: 'Nigerian Suya',
    subtitle: 'Street-style spiced beef skewers',
    cookTime: '15 min', prepTime: '30 min', servings: 4,
    difficulty: 'Easy', calories: 340, category: 'dinner',
    tags: ['nigerian', 'african', 'grill', 'spicy', 'quick'],
    image: 'https://images.unsplash.com/photo-1529193591184-b1fd29045f18?w=700&q=80',
    rating: 4.9,
    ingredients: [
      '600g thin beef slices (sirloin or flank)',
      'Suya spice (yaji): ground peanuts, ginger, paprika, chilli',
      'Vegetable oil',
      'Onion slices & tomatoes for serving',
      'Salt',
    ],
    steps: [
      'Thread beef onto skewers',
      'Coat generously with suya spice and a little oil',
      'Marinate 30 min minimum (overnight is best)',
      'Grill on high heat 3–4 min per side until charred at edges',
      'Serve with sliced onions, tomatoes and extra yaji',
    ],
  },
  {
    id: 'nigerian-pepper-soup',
    title: 'Nigerian Pepper Soup',
    subtitle: 'Aromatic broth — comfort in a bowl',
    cookTime: '40 min', prepTime: '15 min', servings: 4,
    difficulty: 'Easy', calories: 280, category: 'dinner',
    tags: ['nigerian', 'african', 'soup', 'spicy', 'healthy'],
    image: 'https://images.unsplash.com/photo-1547592160-23ac45744acd?w=700&q=80',
    rating: 4.7,
    ingredients: [
      'Catfish or goat meat',
      'Pepper soup spice blend',
      'Scotch bonnet',
      'Scent leaves (nchuanwu) or basil',
      'Ginger, garlic, onion',
      'Seasoning cubes, salt',
    ],
    steps: [
      'Season meat or fish and bring to boil with onion, ginger and garlic',
      'Add pepper soup spice and scotch bonnet; simmer until protein is cooked',
      'Adjust seasoning — broth should be thin, peppery and fragrant',
      'Add scent leaves in the last 2 min',
      'Serve hot with agidi, yam or on its own',
    ],
  },
  {
    id: 'nigerian-fried-rice',
    title: 'Nigerian Fried Rice',
    subtitle: 'Colourful rice with mixed veg & liver',
    cookTime: '35 min', prepTime: '15 min', servings: 5,
    difficulty: 'Medium', calories: 430, category: 'dinner',
    tags: ['nigerian', 'african', 'rice', 'feast'],
    image: 'https://images.unsplash.com/photo-1603133872871-684d6009a2cf?w=700&q=80',
    rating: 4.8,
    ingredients: [
      '3 cups parboiled rice (pre-cooked and cooled)',
      'Chicken liver, diced',
      'Mixed veg: carrots, peas, sweet corn, green beans',
      'Curry powder, thyme',
      'Onion, scotch bonnet',
      'Vegetable oil, seasoning cubes',
    ],
    steps: [
      'Parboil rice with curry and thyme; spread to cool completely',
      'Fry liver pieces until done; set aside',
      'Stir-fry onion, pepper and mixed vegetables 3 min',
      'Add rice in batches, tossing on high heat',
      'Fold in liver; season and serve with coleslaw and plantain',
    ],
  },
  {
    id: 'nigerian-moi-moi',
    title: 'Moi Moi',
    subtitle: 'Steamed bean pudding — protein-rich',
    cookTime: '60 min', prepTime: '25 min', servings: 6,
    difficulty: 'Medium', calories: 220, category: 'lunch',
    tags: ['nigerian', 'african', 'healthy', 'vegetarian', 'meal-prep'],
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=700&q=80',
    rating: 4.7,
    ingredients: [
      '2 cups peeled black-eyed beans',
      'Red bell pepper, scotch bonnet, onion',
      'Palm or vegetable oil',
      'Boiled eggs (optional)',
      'Crayfish, seasoning cubes',
      'Leaves or foil for wrapping',
    ],
    steps: [
      'Blend beans with pepper and onion to a smooth thick batter',
      'Stir in oil, crayfish and seasoning',
      'Pour into leaves, foil cups or a greased pan',
      'Add a boiled egg to each portion if using',
      'Steam or bake 50–60 min until firm and set',
    ],
  },
  {
    id: 'nigerian-akara',
    title: 'Akara',
    subtitle: 'Crispy bean fritters — breakfast favourite',
    cookTime: '20 min', prepTime: '20 min', servings: 4,
    difficulty: 'Easy', calories: 290, category: 'breakfast',
    tags: ['nigerian', 'african', 'quick', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1601050690597-df0568fa7098?w=700&q=80',
    rating: 4.6,
    ingredients: [
      '2 cups peeled black-eyed beans',
      'Scotch bonnet, onion',
      'Salt, seasoning cube',
      'Vegetable oil for deep frying',
    ],
    steps: [
      'Blend beans with minimal water to a thick airy paste',
      'Fold in finely chopped onion and pepper',
      'Whisk vigorously — aeration makes them fluffy',
      'Drop spoonfuls into hot oil; fry until golden all over',
      'Drain and serve with pap (ogi) or bread',
    ],
  },
  {
    id: 'nigerian-puff-puff',
    title: 'Puff Puff',
    subtitle: 'Sweet fried dough balls',
    cookTime: '20 min', prepTime: '90 min', servings: 8,
    difficulty: 'Easy', calories: 180, category: 'dessert',
    tags: ['nigerian', 'african', 'snack', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=700&q=80',
    rating: 4.8,
    ingredients: [
      '3 cups plain flour',
      '1/2 cup sugar',
      '2 tsp active dry yeast',
      'Warm water',
      'Nutmeg (optional)',
      'Vegetable oil for frying',
    ],
    steps: [
      'Proof yeast in warm water with a pinch of sugar',
      'Mix flour, sugar, nutmeg and yeast water to a soft sticky dough',
      'Cover and rise 1–1.5 hours until doubled',
      'Scoop rounds into medium-hot oil',
      'Fry until deep golden; drain and serve warm',
    ],
  },
  {
    id: 'nigerian-efo-riro',
    title: 'Efo Riro',
    subtitle: 'Yoruba spinach stew with assorted meat',
    cookTime: '40 min', prepTime: '15 min', servings: 5,
    difficulty: 'Medium', calories: 380, category: 'dinner',
    tags: ['nigerian', 'african', 'stew', 'healthy'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80',
    rating: 4.7,
    ingredients: [
      'Fresh spinach (efo tete)',
      'Assorted meat & smoked fish',
      'Palm oil',
      'Locust beans (iru)',
      'Scotch bonnet, tatashe, onion',
      'Crayfish, stock cubes',
    ],
    steps: [
      'Blend peppers and onion; boil assorted meat until tender',
      'Fry pepper base in palm oil 10 min',
      'Add locust beans, crayfish and meat stock',
      'Simmer 10 min, then fold in washed spinach',
      'Cook 5 min more — do not overcook greens; serve with amala or eba',
    ],
  },
  {
    id: 'nigerian-asun',
    title: 'Asun',
    subtitle: 'Spicy peppered goat — party favourite',
    cookTime: '50 min', prepTime: '15 min', servings: 4,
    difficulty: 'Medium', calories: 410, category: 'dinner',
    tags: ['nigerian', 'african', 'spicy', 'grill', 'feast'],
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b916?w=700&q=80',
    rating: 4.8,
    ingredients: [
      '1 kg goat meat (bone-in)',
      'Scotch bonnet (generous)',
      'Red bell pepper, onion',
      'Ginger, garlic',
      'Seasoning cubes, thyme',
      'Vegetable oil',
    ],
    steps: [
      'Season goat and pressure-cook or boil until very tender',
      'Grill or pan-sear pieces until slightly charred',
      'Fry blended pepper, onion, ginger and garlic in oil',
      'Toss goat in the pepper sauce on high heat 5 min',
      'Serve sizzling as a starter or with cold drinks',
    ],
  },
  {
    id: 'nigerian-ofada-rice',
    title: 'Ofada Rice & Ayamase',
    subtitle: 'Local rice with green pepper sauce',
    cookTime: '45 min', prepTime: '20 min', servings: 4,
    difficulty: 'Medium', calories: 450, category: 'dinner',
    tags: ['nigerian', 'african', 'rice', 'comfort'],
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=700&q=80',
    rating: 4.7,
    ingredients: [
      'Ofada or local rice',
      'Green bell peppers (tatase)',
      'Scotch bonnet, onion',
      'Palm oil (bleached slightly)',
      'Assorted offal (optional)',
      'Locust beans, crayfish',
      'Stock cubes',
    ],
    steps: [
      'Wash ofada rice thoroughly; cook with minimal water until done',
      'Blend green peppers, scotch bonnet and onion',
      'Heat palm oil, fry pepper base until thick and fragrant',
      'Add boiled assorted meat or offal and locust beans',
      'Serve ayamase over ofada rice with fried plantain',
    ],
  },
  {
    id: 'nigerian-chin-chin',
    title: 'Chin Chin',
    subtitle: 'Crunchy bite-sized snack',
    cookTime: '25 min', prepTime: '20 min', servings: 10,
    difficulty: 'Easy', calories: 160, category: 'dessert',
    tags: ['nigerian', 'african', 'snack', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf64db3b?w=700&q=80',
    rating: 4.6,
    ingredients: [
      '4 cups plain flour',
      '1/2 cup sugar',
      '1/2 cup butter',
      '2 eggs',
      'Nutmeg, baking powder',
      'Milk or water',
      'Oil for frying',
    ],
    steps: [
      'Rub butter into flour with sugar, nutmeg and baking powder',
      'Add eggs and milk; knead to a firm dough',
      'Roll out and cut into small squares or strips',
      'Deep-fry in batches until golden and crisp',
      'Cool completely — stores well in an airtight jar',
    ],
  },

  // ── African & Caribbean ────────────────────────────────────────────────────
  {
    id: 'jamaican-jerk-chicken',
    title: 'Jamaican Jerk Chicken',
    subtitle: 'Fiery, smoky & deeply spiced',
    cookTime: '35 min', prepTime: '20 min', servings: 4,
    difficulty: 'Medium', calories: 390, category: 'dinner',
    tags: ['caribbean', 'jamaican', 'spicy', 'protein'],
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=700&q=80',
    rating: 4.8,
    ingredients: ['Chicken pieces', 'Scotch bonnet', 'Allspice', 'Thyme', 'Spring onions', 'Soy sauce', 'Brown sugar', 'Ginger', 'Garlic'],
    steps: ['Blend all marinade ingredients', 'Score chicken and coat well', 'Marinate at least 2 hours', 'Grill on high heat 35 min turning regularly', 'Rest 5 min before serving'],
  },
  {
    id: 'moroccan-chicken-tagine',
    title: 'Moroccan Chicken Tagine',
    subtitle: 'Slow-cooked with preserved lemon & olives',
    cookTime: '50 min', prepTime: '15 min', servings: 4,
    difficulty: 'Medium', calories: 420, category: 'dinner',
    tags: ['moroccan', 'african', 'slow-cook', 'spiced'],
    image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=700&q=80',
    rating: 4.8,
    ingredients: ['Chicken thighs', 'Preserved lemon', 'Green olives', 'Onion', 'Cumin', 'Coriander', 'Turmeric', 'Cinnamon', 'Chickpeas'],
    steps: ['Brown chicken in tagine or heavy pan', 'Soften onions with all spices', 'Add stock, lemon and olives', 'Simmer covered 40 min', 'Stir in chickpeas and finish with fresh herbs'],
  },
  {
    id: 'west-african-peanut-stew',
    title: 'West African Peanut Stew',
    subtitle: 'Groundnut soup — hearty & warming',
    cookTime: '40 min', prepTime: '15 min', servings: 4,
    difficulty: 'Easy', calories: 480, category: 'dinner',
    tags: ['west-african', 'african', 'stew', 'comfort'],
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80',
    rating: 4.7,
    ingredients: ['Chicken pieces', 'Peanut butter', 'Tomatoes', 'Onion', 'Sweet potato', 'Scotch bonnet', 'Stock', 'Ginger'],
    steps: ['Brown chicken and set aside', 'Fry onion and ginger', 'Add tomatoes and peanut butter', 'Return chicken with stock', 'Simmer 30 min until thick'],
  },
  {
    id: 'ethiopian-doro-wat',
    title: 'Ethiopian Doro Wat',
    subtitle: 'Spiced chicken stew with berbere',
    cookTime: '60 min', prepTime: '20 min', servings: 4,
    difficulty: 'Hard', calories: 445, category: 'dinner',
    tags: ['ethiopian', 'african', 'stew', 'spiced'],
    image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=700&q=80',
    rating: 4.8,
    ingredients: ['Chicken pieces', 'Berbere spice blend', 'Niter kibbeh (spiced butter)', 'Onions', 'Garlic', 'Ginger', 'Hard-boiled eggs'],
    steps: ['Dry-cook onions 20 min until deep brown', 'Add niter kibbeh and berbere', 'Add chicken and coat in sauce', 'Simmer 40 min on very low heat', 'Add scored eggs for last 10 min'],
  },
  {
    id: 'caribbean-rice-and-peas',
    title: 'Caribbean Rice & Peas',
    subtitle: 'Coconut rice with kidney beans',
    cookTime: '30 min', prepTime: '5 min', servings: 4,
    difficulty: 'Easy', calories: 310, category: 'lunch',
    tags: ['caribbean', 'jamaican', 'rice', 'vegetarian'],
    image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=700&q=80',
    rating: 4.7,
    ingredients: ['Long-grain rice', 'Kidney beans', 'Coconut milk', 'Spring onions', 'Thyme', 'Scotch bonnet', 'Garlic'],
    steps: ['Rinse rice well', 'Add all ingredients to pot with coconut milk and water', 'Bring to boil, then simmer covered 20 min', 'Remove scotch bonnet', 'Fluff with fork and serve'],
  },
  {
    id: 'ackee-saltfish',
    title: 'Ackee & Saltfish',
    subtitle: 'Jamaica\'s national breakfast',
    cookTime: '20 min', prepTime: '15 min', servings: 2,
    difficulty: 'Medium', calories: 370, category: 'breakfast',
    tags: ['jamaican', 'caribbean', 'breakfast', 'fish'],
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=700&q=80',
    rating: 4.8,
    ingredients: ['Canned ackee', 'Saltfish (salted cod)', 'Onion', 'Scotch bonnet', 'Tomato', 'Thyme', 'Spring onions', 'Vegetable oil'],
    steps: ['Desalt fish by boiling 15 min, then flake', 'Sauté onion, pepper and tomato', 'Add flaked fish and thyme', 'Fold in drained ackee gently', 'Season and serve with dumplings or breadfruit'],
  },
  {
    id: 'south-african-bobotie',
    title: 'South African Bobotie',
    subtitle: 'Spiced mince bake with egg custard',
    cookTime: '50 min', prepTime: '20 min', servings: 4,
    difficulty: 'Medium', calories: 460, category: 'dinner',
    tags: ['south-african', 'african', 'bake', 'comfort'],
    image: 'https://images.unsplash.com/photo-1598511757337-fe2cafc31ba0?w=700&q=80',
    rating: 4.6,
    ingredients: ['Beef mince', 'Onion', 'Apricot jam', 'Curry powder', 'Turmeric', 'Eggs', 'Milk', 'Bay leaves', 'Bread soaked in milk'],
    steps: ['Soften onion and spices', 'Add mince and brown well', 'Mix in jam and bread', 'Transfer to baking dish', 'Top with egg-milk custard and bake 30 min'],
  },

  // ── South Asian ────────────────────────────────────────────────────────────
  {
    id: 'butter-chicken',
    title: 'Butter Chicken',
    subtitle: 'Creamy tomato curry — restaurant style',
    cookTime: '35 min', prepTime: '20 min', servings: 4,
    difficulty: 'Medium', calories: 490, category: 'dinner',
    tags: ['indian', 'curry', 'protein', 'comfort'],
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=700&q=80',
    rating: 4.9,
    ingredients: ['Chicken thighs', 'Butter', 'Tomato passata', 'Double cream', 'Garam masala', 'Cumin', 'Ginger', 'Garlic', 'Fenugreek leaves'],
    steps: ['Marinate chicken in yoghurt and spices', 'Grill or pan-fry chicken', 'Melt butter and fry spices', 'Add passata and simmer 15 min', 'Add cream and chicken; finish with kasuri methi'],
  },
  {
    id: 'chana-masala',
    title: 'Chana Masala',
    subtitle: 'Spiced chickpea curry',
    cookTime: '30 min', prepTime: '10 min', servings: 4,
    difficulty: 'Easy', calories: 335, category: 'dinner',
    tags: ['indian', 'vegetarian', 'plant-based', 'curry'],
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700&q=80',
    rating: 4.7,
    ingredients: ['Chickpeas (2 cans)', 'Tomatoes', 'Onion', 'Ginger', 'Garlic', 'Garam masala', 'Cumin', 'Coriander powder'],
    steps: ['Bloom spices in oil', 'Add onion and cook until golden', 'Add ginger, garlic and tomatoes', 'Stir in chickpeas and simmer 15 min', 'Mash some chickpeas to thicken, finish with fresh coriander'],
  },
  {
    id: 'saag-paneer',
    title: 'Saag Paneer',
    subtitle: 'Spiced spinach with fresh cheese',
    cookTime: '25 min', prepTime: '10 min', servings: 3,
    difficulty: 'Easy', calories: 290, category: 'dinner',
    tags: ['indian', 'vegetarian', 'healthy', 'quick'],
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700&q=80',
    rating: 4.6,
    ingredients: ['Paneer 250g', 'Spinach 500g', 'Onion', 'Garlic', 'Ginger', 'Cumin seeds', 'Garam masala', 'Cream'],
    steps: ['Pan-fry paneer cubes until golden', 'Wilt and blend spinach', 'Fry cumin, onion, garlic and ginger', 'Add spinach purée and spices', 'Stir in paneer and a splash of cream'],
  },
  {
    id: 'dal-tadka',
    title: 'Dal Tadka',
    subtitle: 'Yellow lentils with smoky tempered butter',
    cookTime: '30 min', prepTime: '5 min', servings: 4,
    difficulty: 'Easy', calories: 240, category: 'healthy',
    tags: ['indian', 'vegetarian', 'plant-based', 'healthy', 'meal-prep'],
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700&q=80',
    rating: 4.8,
    ingredients: ['Red lentils 250g', 'Onion', 'Tomatoes', 'Cumin seeds', 'Mustard seeds', 'Garlic', 'Dried chilli', 'Ghee', 'Turmeric'],
    steps: ['Boil lentils with turmeric until soft', 'Heat ghee and bloom all seeds', 'Add garlic and dried chilli', 'Fry onion and tomato', 'Pour tadka over lentils and stir'],
  },
  {
    id: 'biryani-chicken',
    title: 'Chicken Biryani',
    subtitle: 'Fragrant layered rice — feast dish',
    cookTime: '55 min', prepTime: '25 min', servings: 5,
    difficulty: 'Hard', calories: 570, category: 'dinner',
    tags: ['indian', 'rice', 'protein', 'feast'],
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=700&q=80',
    rating: 4.9,
    ingredients: ['Basmati rice', 'Chicken thighs', 'Yoghurt', 'Onion', 'Saffron', 'Whole spices', 'Biryani masala', 'Mint', 'Ghee'],
    steps: ['Marinate chicken in yoghurt and spices 1 hr', 'Parboil rice with whole spices to 70%', 'Layer chicken then rice in pot', 'Drizzle saffron milk and ghee', 'Seal and dum-cook on low 25 min'],
  },

  // ── Middle Eastern ────────────────────────────────────────────────────────
  {
    id: 'shakshuka',
    title: 'Shakshuka',
    subtitle: 'Eggs poached in spiced tomato sauce',
    cookTime: '20 min', prepTime: '10 min', servings: 2,
    difficulty: 'Easy', calories: 285, category: 'breakfast',
    tags: ['middle-eastern', 'quick', 'vegetarian', 'healthy'],
    image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=700&q=80',
    rating: 4.8,
    ingredients: ['Eggs 4', 'Crushed tomatoes 800g', 'Bell pepper', 'Cumin', 'Smoked paprika', 'Garlic', 'Feta', 'Crusty bread'],
    steps: ['Fry peppers with spices', 'Add tomatoes and simmer 12 min', 'Make wells and crack in eggs', 'Cover and cook until whites set', 'Crumble feta and serve with bread'],
  },
  {
    id: 'lamb-kofta',
    title: 'Lamb Kofta',
    subtitle: 'Spiced minced lamb on skewers',
    cookTime: '15 min', prepTime: '15 min', servings: 4,
    difficulty: 'Easy', calories: 380, category: 'dinner',
    tags: ['middle-eastern', 'protein', 'quick', 'grill'],
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=700&q=80',
    rating: 4.7,
    ingredients: ['Lamb mince 500g', 'Onion', 'Cumin', 'Coriander', 'Cinnamon', 'Chilli flakes', 'Fresh mint', 'Garlic'],
    steps: ['Mix all ingredients until sticky', 'Shape around skewers', 'Chill 30 min', 'Grill on high 10–12 min turning', 'Serve with flatbread and yoghurt sauce'],
  },
  {
    id: 'falafel-wrap',
    title: 'Crispy Falafel Wrap',
    subtitle: 'Herby chickpea patties in flatbread',
    cookTime: '20 min', prepTime: '15 min', servings: 3,
    difficulty: 'Medium', calories: 395, category: 'lunch',
    tags: ['middle-eastern', 'vegetarian', 'healthy', 'quick'],
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=700&q=80',
    rating: 4.6,
    ingredients: ['Chickpeas (dried, soaked)', 'Parsley', 'Coriander', 'Onion', 'Cumin', 'Garlic', 'Flatbreads', 'Tahini', 'Tomato', 'Cucumber'],
    steps: ['Blend chickpeas with herbs and spices (do not use canned)', 'Form into patties', 'Fry in 1 cm oil until golden', 'Warm flatbreads', 'Wrap with falafel, salad and tahini sauce'],
  },
  {
    id: 'hummus-from-scratch',
    title: 'Proper Homemade Hummus',
    subtitle: 'Silky smooth & better than bought',
    cookTime: '5 min', prepTime: '10 min', servings: 6,
    difficulty: 'Easy', calories: 150, category: 'healthy',
    tags: ['middle-eastern', 'vegetarian', 'quick', 'healthy', 'meal-prep'],
    image: 'https://images.unsplash.com/photo-1571167530149-c1105da4c2c0?w=700&q=80',
    rating: 4.9,
    ingredients: ['Chickpeas (2 cans)', 'Tahini 4 tbsp', 'Lemon juice', 'Garlic 1 clove', 'Ice water', 'Olive oil', 'Cumin', 'Salt'],
    steps: ['Drain chickpeas, keep a few for topping', 'Blend tahini and lemon first until creamy', 'Add chickpeas and garlic', 'Stream in ice water while blending', 'Season and top with olive oil, paprika and cumin'],
  },
];

const COOKING_TIPS = [
  'Rest your meat for 5–10 minutes after cooking so the juices redistribute, giving a juicier bite.',
  'Salt pasta water generously — it should taste of the sea. This is your only chance to season the pasta itself.',
  'A dry pan produces a crust; a wet pan steams. Always pat protein dry before searing.',
  'Bloom whole spices in dry oil before adding liquids — heat unlocks their essential oils.',
  'Cold butter swirled in at the end of a sauce gives it shine and body without breaking it.',
  'Caramelise your onions properly: low heat, 20–30 minutes minimum, not 5.',
  'Acid (lemon, vinegar) added at the end brightens and lifts rich, fatty dishes.',
  'Toast your nuts and seeds in a dry pan for 2 minutes — it doubles their flavour.',
  'Let your dough or batter rest. Gluten relaxes and the result is always more tender.',
  'The steam inside a covered pot does more work than high direct heat — use it.',
  'Taste as you go, not just at the end. You\'re cooking, not following instructions.',
  'A hot oven (220°C+) roasts. A moderate oven (180°C) braises. Know the difference.',
  'Mise en place — prep everything before you start cooking. It transforms the experience.',
  'Deglaze the pan with stock or wine to capture all the caramelised fond (= flavour).',
  'Season in layers: at each stage, not just at the end of cooking.',
];

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
};

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'Easy': return '#34C759';
    case 'Medium': return '#FF9500';
    case 'Hard': return '#FF3B30';
    default: return '#8E8E93';
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CookingScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const { bookmarks, toggleBookmark, isBookmarked, recordCooked, cookCounts, hydrated } = useCookingStorage();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0)).current;
  const categoryScrollRef = useRef<ScrollView>(null);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const planItemsKey = `cooking_meal_plan_items_${userId}_${todayKey}`;
  const mealPlanKey = `cooking_meal_plan_${userId}_${todayKey}`;

  useEffect(() => {
    Animated.spring(headerScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
  }, [headerScale]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    const loadMealPlan = async () => {
      try {
        const [storedPlanRaw, completedRaw] = await Promise.all([
          AsyncStorage.getItem(planItemsKey),
          AsyncStorage.getItem(mealPlanKey),
        ]);
        if (cancelled) return;

        const completed = new Set<string>(
          completedRaw ? (JSON.parse(completedRaw) as string[]) : [],
        );

        let base: Omit<MealPlanItem, 'completed'>[];
        if (storedPlanRaw) {
          base = hydrateStoredMealPlan(JSON.parse(storedPlanRaw) as StoredMealPlanEntry[]);
        } else {
          base = buildTodaysMealPlan(bookmarks, getDayOfYear());
          await AsyncStorage.setItem(planItemsKey, JSON.stringify(serializeMealPlan(base)));
        }

        if (!cancelled) {
          setMealPlan(base.map((m) => ({ ...m, completed: completed.has(m.id) })));
        }
      } catch {
        if (!cancelled) {
          const fallback = buildTodaysMealPlan(bookmarks, getDayOfYear());
          setMealPlan(fallback.map((m) => ({ ...m, completed: false })));
        }
      }
    };

    void loadMealPlan();
    return () => {
      cancelled = true;
    };
  }, [hydrated, bookmarks, planItemsKey, mealPlanKey]);

  const toggleMealComplete = useCallback((mealId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMealPlan((prev) => {
      const next = prev.map((m) => (m.id === mealId ? { ...m, completed: !m.completed } : m));
      const completedIds = next.filter((m) => m.completed).map((m) => m.id);
      AsyncStorage.setItem(mealPlanKey, JSON.stringify(completedIds)).catch(() => {});
      return next;
    });
  }, [mealPlanKey]);

  const openMealRecipe = useCallback((recipeId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
    setSelectedCategory('all');
    setExpandedRecipe(recipeId);
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const completedMealCount = mealPlan.filter((m) => m.completed).length;
  const mealProgress = mealPlan.length > 0 ? completedMealCount / mealPlan.length : 0;

  const mealPlanSourceLabel = useMemo(() => {
    const favCount = mealPlan.filter((m) => m.fromFavourite).length;
    if (favCount === mealPlan.length && favCount > 0) return 'From your favourites';
    if (favCount > 0) return `${favCount} from favourites · rest suggested`;
    if (bookmarks.length === 0) return 'Tap ♥ on recipes to personalise tomorrow';
    return 'Suggested for today';
  }, [mealPlan, bookmarks.length]);

  const filteredRecipes = useMemo(() => {
    let filtered = ALL_RECIPES;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((r) => r.category === selectedCategory || r.tags.includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)) ||
          r.ingredients.some((i) => i.toLowerCase().includes(q)),
      );
    }
    return filtered;
  }, [selectedCategory, searchQuery]);

  const favouriteRecipes = useMemo(() => ALL_RECIPES.filter((r) => isBookmarked(r.id)), [bookmarks]);

  // ── Live stats ──────────────────────────────────────────────────────────────
  const totalCookedThisWeek = useMemo(() => {
    return Object.values(cookCounts).reduce((sum, n) => sum + n, 0);
  }, [cookCounts]);

  const QUICK_STATS = useMemo(
    () => [
      { label: 'Recipes Saved', value: String(bookmarks.length), icon: Bookmark, iconColor: '#007AFF' },
      { label: 'Cooked Total', value: String(totalCookedThisWeek), icon: Flame, iconColor: '#FF6347' },
      { label: 'Recipes', value: String(ALL_RECIPES.length), icon: Trophy, iconColor: '#FFD700' },
    ],
    [bookmarks.length, totalCookedThisWeek],
  );

  // ── Daily tip ───────────────────────────────────────────────────────────────
  const todayTip = COOKING_TIPS[getDayOfYear() % COOKING_TIPS.length];

  // ── Hero / featured pick ────────────────────────────────────────────────────
  const heroRecipe = useMemo(() => {
    const topRated = [...ALL_RECIPES].sort((a, b) => b.rating - a.rating);
    // Rotate daily so it changes each day
    return topRated[getDayOfYear() % topRated.length];
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // ── Colours ─────────────────────────────────────────────────────────────────
  const accentColor = '#E8603C';
  const accentLight = '#FFF0EB';
  const warmBg = isDark ? '#1A1210' : '#FDF8F5';
  const cardBg = isDark ? '#2A2220' : '#FFFFFF';
  const cardBorder = isDark ? '#3A302E' : '#F0E8E4';
  const subtleText = isDark ? '#A09490' : '#8C7E78';
  const mainText = isDark ? '#F5EDE8' : '#2C1E16';
  const secondaryBg = isDark ? '#221A18' : '#FAF3EF';

  return (
    <KeyboardAvoidingScreen>
    <View style={[styles.container, { backgroundColor: warmBg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentColor} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* ── Live stats ──────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <stat.icon size={22} color={stat.iconColor} />
              <Text style={[styles.statValue, { color: mainText }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: subtleText }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Hero featured pick ───────────────────────────────────────────── */}
        {!searchQuery && (
          <View style={styles.heroSection}>
            <Text style={[styles.heroLabel, { color: subtleText }]}>TOP PICK TODAY</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setExpandedRecipe(expandedRecipe === heroRecipe.id ? null : heroRecipe.id)}
              style={[styles.heroCard, { borderColor: cardBorder }]}
            >
              <Image source={{ uri: heroRecipe.image }} style={styles.heroImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
              <View style={styles.heroOverlay}>
                <View style={[styles.heroBadge, { backgroundColor: accentColor }]}>
                  <Star size={11} color="#fff" fill="#fff" />
                  <Text style={styles.heroBadgeText}>{heroRecipe.rating}</Text>
            </View>
                <Text style={styles.heroTitle} numberOfLines={2}>{heroRecipe.title}</Text>
                <Text style={styles.heroSubtitle}>{heroRecipe.subtitle}</Text>
                <View style={styles.heroMeta}>
                  <Clock size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMetaText}>{heroRecipe.cookTime}</Text>
                  <View style={styles.heroDot} />
                  <Flame size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMetaText}>{heroRecipe.calories} kcal</Text>
                  <View style={styles.heroDot} />
                  <Text style={[styles.heroMetaText, { color: getDifficultyColor(heroRecipe.difficulty) }]}>{heroRecipe.difficulty}</Text>
                </View>
          </View>
          <TouchableOpacity
                style={styles.heroBookmark}
                onPress={() => void toggleBookmark(heroRecipe.id)}
              >
                <Heart size={17} color={isBookmarked(heroRecipe.id) ? '#FF3B30' : '#fff'} fill={isBookmarked(heroRecipe.id) ? '#FF3B30' : 'transparent'} />
          </TouchableOpacity>
            </TouchableOpacity>
            {expandedRecipe === heroRecipe.id && (
              <View style={[styles.heroExpanded, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.expandedLabel, { color: accentColor }]}>Ingredients</Text>
                <View style={styles.ingredientsList}>
                  {heroRecipe.ingredients.map((ing, i) => (
                    <View key={i} style={[styles.ingredientChip, { backgroundColor: secondaryBg }]}>
                      <Text style={[styles.ingredientText, { color: mainText }]}>{ing}</Text>
              </View>
                  ))}
              </View>
                <Text style={[styles.expandedLabel, { color: accentColor, marginTop: 12 }]}>Steps</Text>
                {heroRecipe.steps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNumber, { backgroundColor: accentColor }]}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
                    <Text style={[styles.stepText, { color: mainText }]}>{step}</Text>
            </View>
                ))}
            <TouchableOpacity
                  style={[styles.cookBtn, { backgroundColor: accentColor }]}
                  onPress={() => { void recordCooked(heroRecipe.id); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                >
                  <ChefHat size={16} color="#fff" />
                  <Text style={styles.cookBtnText}>Mark as cooked</Text>
            </TouchableOpacity>
          </View>
            )}
        </View>
        )}

        {/* ── Meal plan ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ClipboardList size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: mainText }]}>Today's Meal Plan</Text>
            </View>
            <View style={[styles.progressPill, { backgroundColor: isDark ? '#2A2220' : accentLight }]}>
              <Text style={[styles.progressText, { color: accentColor }]}>
                {mealPlan.length > 0 ? `${completedMealCount}/${mealPlan.length}` : '—'}
            </Text>
          </View>
          </View>
          <Text style={[styles.mealPlanSubtitle, { color: subtleText }]}>{mealPlanSourceLabel}</Text>

          <View style={[styles.progressBarBg, { backgroundColor: cardBorder }]}>
            <View style={[styles.progressBarFill, { backgroundColor: accentColor, width: `${mealProgress * 100}%` as any }]} />
        </View>

          {mealPlan.map((item) => (
            <View key={item.id} style={[styles.mealItem, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <TouchableOpacity
                style={styles.mealItemMain}
                onPress={() => openMealRecipe(item.recipeId)}
                activeOpacity={0.7}
              >
                <View style={[styles.mealIconWrap, { backgroundColor: item.completed ? (isDark ? '#1A2E1A' : '#E8F8E8') : secondaryBg }]}>
                  <item.icon size={18} color={item.completed ? '#34C759' : item.iconColor} />
                </View>
                <View style={styles.mealInfo}>
                  <View style={styles.mealTitleRow}>
                    <Text style={[styles.mealType, { color: subtleText }]}>{item.meal}</Text>
                    {item.fromFavourite && (
                      <View style={[styles.mealFavBadge, { backgroundColor: isDark ? '#2A2220' : accentLight }]}>
                        <Heart size={10} color={accentColor} fill={accentColor} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.mealRecipe, { color: mainText }, item.completed && styles.mealCompleted]}>{item.recipe}</Text>
                </View>
                <Text style={[styles.mealTime, { color: subtleText }]}>{item.time}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkCircle, { backgroundColor: item.completed ? '#34C759' : 'transparent', borderColor: item.completed ? '#34C759' : cardBorder }]}
                onPress={() => toggleMealComplete(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={item.completed ? 'Mark meal incomplete' : 'Mark meal complete'}
              >
                {item.completed && <Check size={13} color="#fff" />}
              </TouchableOpacity>
          </View>
          ))}
        </View>

        {/* ── Category filter ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Tag size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: mainText }]}>Categories</Text>
                </View>
                </View>
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
            // Preserve scroll position across re-renders
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          >
            {RECIPE_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
              <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: isActive ? accentColor : cardBg, borderColor: isActive ? accentColor : cardBorder }]}
                  onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCategory(cat.id); }}
                  activeOpacity={0.7}
                >
                  <cat.icon size={16} color={isActive ? '#FFFFFF' : cat.iconColor} />
                  <Text style={[styles.categoryLabel, { color: isActive ? '#FFFFFF' : mainText }]}>{cat.label}</Text>
              </TouchableOpacity>
              );
            })}
        </ScrollView>
        </View>

        {/* ── Favourites ────────────────────────────────────────────────────── */}
        {favouriteRecipes.length > 0 && selectedCategory === 'all' && !searchQuery && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Heart size={18} color="#FF3B30" />
                <Text style={[styles.sectionTitle, { color: mainText }]}>Favourites</Text>
              </View>
              <Text style={[styles.resultCount, { color: subtleText }]}>{favouriteRecipes.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favouritesScroll}>
              {favouriteRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={[styles.favouriteCard, { borderColor: cardBorder }]}
                  onPress={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: recipe.image }} style={styles.favouriteImage} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.favouriteGradient} />
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
                  <TouchableOpacity style={styles.favouriteHeart} onPress={() => void toggleBookmark(recipe.id)}>
                    <Heart size={16} color="#FF3B30" fill="#FF3B30" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Recipe list ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <UtensilsCrossed size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: mainText }]}>
                {selectedCategory === 'all' ? 'All Recipes' : RECIPE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Recipes'}
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
                  onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedRecipe(isExpanded ? null : recipe.id); }}
                  activeOpacity={0.85}
                >
                  <View style={styles.recipeRow}>
                    <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
                    <View style={styles.recipeInfo}>
                      <View style={styles.recipeTop}>
                        <Text style={[styles.recipeTitle, { color: mainText }]} numberOfLines={1}>{recipe.title}</Text>
                        <TouchableOpacity onPress={() => void toggleBookmark(recipe.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Heart size={18} color={isBookmarked(recipe.id) ? '#FF3B30' : subtleText} fill={isBookmarked(recipe.id) ? '#FF3B30' : 'transparent'} />
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

                  {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: cardBorder }]}>
                      <View style={styles.expandedSection}>
                        <Text style={[styles.expandedLabel, { color: accentColor }]}>Ingredients</Text>
                        <View style={styles.ingredientsList}>
                          {recipe.ingredients.map((ing, i) => (
                            <View key={i} style={[styles.ingredientChip, { backgroundColor: secondaryBg }]}>
                              <Text style={[styles.ingredientText, { color: mainText }]}>{ing}</Text>
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
                          <Users size={14} color={subtleText} />
                          <Text style={[styles.detailText, { color: mainText }]}>{recipe.servings} servings</Text>
                        </View>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <Timer size={14} color={subtleText} />
                          <Text style={[styles.detailText, { color: mainText }]}>Prep: {recipe.prepTime}</Text>
                        </View>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <Star size={14} color="#FFD700" />
                          <Text style={[styles.detailText, { color: mainText }]}>{recipe.rating}</Text>
                        </View>
                      </View>
              <TouchableOpacity
                        style={[styles.cookBtn, { backgroundColor: accentColor }]}
                        onPress={() => { void recordCooked(recipe.id); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                      >
                        <ChefHat size={16} color="#fff" />
                        <Text style={styles.cookBtnText}>Mark as cooked</Text>
                      </TouchableOpacity>
                </View>
                  )}
              </TouchableOpacity>
              );
            })
            )}
        </View>

        {/* ── Daily tip ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.tipCard, { backgroundColor: isDark ? '#2A261A' : '#FFF8E8' }]}>
            <View style={styles.tipIconWrap}>
              <Lightbulb size={20} color="#F59E0B" />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: mainText }]}>Cooking Tip of the Day</Text>
              <Text style={[styles.tipText, { color: subtleText }]}>{todayTip}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
    </KeyboardAvoidingScreen>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...appFont('700', { display: true }), fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.5 },
  headerSubtitle: { ...appFont('400'), fontSize: 13, marginTop: 1 },
  headerAction: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 44, borderRadius: 14, borderWidth: 1, gap: 10 },
  searchInput: { ...appFont('400'), flex: 1, fontSize: 15, paddingVertical: 0 },
  scrollContent: { paddingTop: 8 },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  statValue: { ...appFont('700'), fontSize: 18, fontWeight: '700' as const },
  statLabel: { ...appFont('400'), fontSize: 11, marginTop: 2, textAlign: 'center' as const },

  // Hero
  heroSection: { paddingHorizontal: 20, marginBottom: 24 },
  heroLabel: { ...appFont('700'), fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, marginBottom: 10 },
  heroCard: { height: 220, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  heroImage: { width: '100%', height: '100%', borderRadius: 20 },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginBottom: 6 },
  heroBadgeText: { ...appFont('700'), color: '#fff', fontSize: 11, fontWeight: '700' as const },
  heroTitle: { ...appFont('700', { display: true }), color: '#fff', fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 26 },
  heroSubtitle: { ...appFont('400'), color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  heroMetaText: { ...appFont('500'), color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' as const },
  heroDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  heroBookmark: { position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroExpanded: { marginTop: 8, borderRadius: 16, borderWidth: 1, padding: 14 },

  // Meal plan
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...appFont('700'), fontSize: 18, fontWeight: '700' as const },
  seeAll: { ...appFont('600'), fontSize: 14, fontWeight: '600' as const },
  resultCount: { ...appFont('400'), fontSize: 13 },
  progressPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  progressText: { ...appFont('700'), fontSize: 13, fontWeight: '700' as const },
  mealPlanSubtitle: { ...appFont('400'), fontSize: 12, paddingHorizontal: 20, marginTop: -4, marginBottom: 10 },
  progressBarBg: { height: 4, borderRadius: 2, marginHorizontal: 20, marginBottom: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  mealItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingRight: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  mealItemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, paddingRight: 8 },
  mealIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealInfo: { flex: 1, marginLeft: 12 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealFavBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  mealType: { ...appFont('600'), fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  mealRecipe: { ...appFont('600'), fontSize: 15, fontWeight: '600' as const, marginTop: 2 },
  mealCompleted: { textDecorationLine: 'line-through' as const, opacity: 0.5 },
  mealTime: { ...appFont('500'), fontSize: 12, fontWeight: '500' as const, marginRight: 4 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  // Categories
  categoriesScroll: { paddingHorizontal: 20, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 6 },
  categoryLabel: { ...appFont('600'), fontSize: 13, fontWeight: '600' as const },

  // Favourites
  favouritesScroll: { paddingHorizontal: 20, gap: 12 },
  favouriteCard: { width: 180, height: 140, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  favouriteImage: { width: '100%', height: '100%', borderRadius: 18 },
  favouriteGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  favouriteOverlay: { position: 'absolute', bottom: 10, left: 12, right: 12 },
  favouriteTitle: { ...appFont('700'), color: '#FFFFFF', fontSize: 14, fontWeight: '700' as const },
  favouriteMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  favouriteMetaText: { ...appFont('500'), color: '#FFFFFF', fontSize: 11, fontWeight: '500' as const },
  favouriteDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  favouriteHeart: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },

  // Recipe cards
  recipeCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  recipeRow: { flexDirection: 'row', padding: 12 },
  recipeImage: { width: 80, height: 80, borderRadius: 14 },
  recipeInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  recipeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recipeTitle: { ...appFont('700'), fontSize: 16, fontWeight: '700' as const, flex: 1, marginRight: 8 },
  recipeSubtitle: { ...appFont('400'), fontSize: 12, marginTop: 2 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  recipeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipeMetaText: { ...appFont('500'), fontSize: 12, fontWeight: '500' as const },
  recipeDiffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  recipeDiffText: { ...appFont('600'), fontSize: 11, fontWeight: '600' as const },
  expandedContent: { borderTopWidth: 1, padding: 14 },
  expandedSection: { marginBottom: 14 },
  expandedLabel: { ...appFont('700'), fontSize: 13, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 },
  ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingredientChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  ingredientText: { ...appFont('500'), fontSize: 12, fontWeight: '500' as const },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  stepNumber: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumberText: { ...appFont('700'), color: '#FFFFFF', fontSize: 11, fontWeight: '700' as const },
  stepText: { ...appFont('400'), flex: 1, fontSize: 13, lineHeight: 20 },
  recipeDetailsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  detailText: { ...appFont('500'), fontSize: 12, fontWeight: '500' as const },
  cookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 12, borderRadius: 12 },
  cookBtnText: { ...appFont('700'), color: '#fff', fontSize: 14, fontWeight: '700' as const },
  emptyState: { marginHorizontal: 20, padding: 40, borderRadius: 18, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTitle: { ...appFont('700'), fontSize: 17, fontWeight: '700' as const },
  emptyText: { ...appFont('400'), fontSize: 13, marginTop: 4 },

  // Tip
  tipCard: { flexDirection: 'row', marginHorizontal: 20, padding: 16, borderRadius: 18, gap: 12 },
  tipIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.15)', alignItems: 'center', justifyContent: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { ...appFont('700'), fontSize: 15, fontWeight: '700' as const, marginBottom: 4 },
  tipText: { ...appFont('400'), fontSize: 13, lineHeight: 19 },
});
