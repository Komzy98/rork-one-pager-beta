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
  Share,
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
  Plus,
  Scale,
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Share2,
} from 'lucide-react-native';
import { Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

const DIET_LABELS: Record<string, { label: string; emoji: string; tagline: string }> = {
  mediterranean: { label: 'Mediterranean', emoji: '\uD83C\uDF45', tagline: 'Olive oil, fish, veg & whole grains' },
  'high-protein': { label: 'High-Protein', emoji: '\uD83E\uDD5A', tagline: 'Fuel muscle & recovery' },
  'plant-based': { label: 'Plant-Based', emoji: '\uD83C\uDF31', tagline: 'Powered by plants' },
  vegetarian: { label: 'Vegetarian', emoji: '\uD83E\uDD57', tagline: 'Meat-free meals' },
  'low-carb': { label: 'Low-Carb', emoji: '\uD83E\uDD51', tagline: 'Less sugar, more energy' },
  keto: { label: 'Keto', emoji: '\uD83E\uDD51', tagline: 'High fat, very low carb' },
  'whole-foods': { label: 'Whole Foods', emoji: '\uD83C\uDF3F', tagline: 'Nothing processed' },
  healthy: { label: 'Healthy', emoji: '\uD83C\uDF4F', tagline: 'Light & nourishing' },
};



interface Ingredient {
  name: string;
  amount?: number;
  unit?: string;
}

interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  cookTime: string;
  prepTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  tags: string[];
  image: string;
  rating: number;
  isFavourite: boolean;
  ingredients: Ingredient[];
  steps: string[];
  stepTimers?: (number | null)[];
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
    protein: 38,
    carbs: 12,
    fat: 24,
    category: 'dinner',
    tags: ['one-pan', 'high-protein', 'italian', 'low-carb'],
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600',
    rating: 4.8,
    isFavourite: true,
    ingredients: [
      { name: 'Chicken breast', amount: 4, unit: 'fillets' },
      { name: 'Sun-dried tomatoes', amount: 100, unit: 'g' },
      { name: 'Spinach', amount: 150, unit: 'g' },
      { name: 'Garlic cloves', amount: 3, unit: 'cloves' },
      { name: 'Heavy cream', amount: 250, unit: 'ml' },
      { name: 'Parmesan', amount: 50, unit: 'g' },
      { name: 'Olive oil', amount: 2, unit: 'tbsp' },
      { name: 'Italian seasoning', amount: 1, unit: 'tsp' },
    ],
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
    protein: 10,
    carbs: 32,
    fat: 16,
    category: 'breakfast',
    tags: ['quick', 'healthy', 'vegetarian', 'mediterranean', 'whole-foods'],
    image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600',
    rating: 4.5,
    isFavourite: false,
    ingredients: [
      { name: 'Sourdough bread', amount: 2, unit: 'slices' },
      { name: 'Avocado', amount: 1, unit: 'whole' },
      { name: 'Cherry tomatoes', amount: 100, unit: 'g' },
      { name: 'Feta cheese', amount: 40, unit: 'g' },
      { name: 'Chilli flakes', amount: 0.5, unit: 'tsp' },
      { name: 'Lemon', amount: 0.5, unit: 'whole' },
    ],
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
    protein: 28,
    carbs: 34,
    fat: 14,
    category: 'dinner',
    tags: ['spicy', 'thai', 'curry', 'high-protein'],
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600',
    rating: 4.7,
    isFavourite: true,
    ingredients: [
      { name: 'Green curry paste', amount: 3, unit: 'tbsp' },
      { name: 'Coconut milk', amount: 400, unit: 'ml' },
      { name: 'Chicken thigh', amount: 500, unit: 'g' },
      { name: 'Thai basil', amount: 1, unit: 'handful' },
      { name: 'Bamboo shoots', amount: 150, unit: 'g' },
      { name: 'Fish sauce', amount: 2, unit: 'tbsp' },
      { name: 'Jasmine rice', amount: 300, unit: 'g' },
    ],
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
    protein: 12,
    carbs: 48,
    fat: 6,
    category: 'breakfast',
    tags: ['healthy', 'quick', 'vegetarian', 'plant-based', 'whole-foods'],
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600',
    rating: 4.6,
    isFavourite: false,
    ingredients: [
      { name: 'Mixed berries', amount: 150, unit: 'g' },
      { name: 'Banana', amount: 1, unit: 'whole' },
      { name: 'Greek yoghurt', amount: 150, unit: 'g' },
      { name: 'Granola', amount: 30, unit: 'g' },
      { name: 'Chia seeds', amount: 1, unit: 'tbsp' },
      { name: 'Honey', amount: 1, unit: 'tsp' },
    ],
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
    protein: 34,
    carbs: 8,
    fat: 20,
    category: 'healthy',
    tags: ['fish', 'healthy', 'high-protein', 'mediterranean', 'low-carb', 'whole-foods'],
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
    ] as Ingredient[],
    steps: ['Preheat oven to 200\u00B0C / 400\u00B0F', 'Season salmon with salt, pepper, minced garlic & dill', 'Place on lined tray with asparagus, drizzle olive oil', 'Top with lemon slices, bake 12-15 min', 'Squeeze fresh lemon juice before serving'],
    stepTimers: [null, null, null, 780, null],
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
    protein: 8,
    carbs: 42,
    fat: 32,
    category: 'dessert',
    tags: ['chocolate', 'dessert', 'indulgent'],
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600',
    rating: 4.9,
    isFavourite: false,
    ingredients: [
      { name: 'Dark chocolate', amount: 100, unit: 'g' },
      { name: 'Butter', amount: 80, unit: 'g' },
      { name: 'Eggs', amount: 2, unit: 'whole' },
      { name: 'Sugar', amount: 60, unit: 'g' },
      { name: 'Flour', amount: 30, unit: 'g' },
      { name: 'Vanilla extract', amount: 1, unit: 'tsp' },
    ],
    steps: ['Preheat oven to 220\u00B0C / 425\u00B0F, butter ramekins', 'Melt chocolate & butter together, stir smooth', 'Whisk eggs, sugar & vanilla until pale', 'Fold chocolate mix into eggs, add flour', 'Pour into ramekins, bake 10-12 min until edges set'],
    stepTimers: [null, 120, 120, null, 660],
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
    protein: 14,
    carbs: 44,
    fat: 14,
    category: 'lunch',
    tags: ['healthy', 'vegetarian', 'meal-prep', 'mediterranean', 'plant-based', 'whole-foods'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    rating: 4.5,
    isFavourite: false,
    ingredients: [
      { name: 'Quinoa', amount: 150, unit: 'g' },
      { name: 'Cucumber', amount: 1, unit: 'whole' },
      { name: 'Cherry tomatoes', amount: 150, unit: 'g' },
      { name: 'Kalamata olives', amount: 50, unit: 'g' },
      { name: 'Feta', amount: 80, unit: 'g' },
      { name: 'Hummus', amount: 4, unit: 'tbsp' },
      { name: 'Olive oil', amount: 2, unit: 'tbsp' },
    ],
    steps: ['Rinse quinoa, cook in salted water 12-15 min', 'Chop cucumber, halve tomatoes, slice olives', 'Divide quinoa between bowls', 'Top with veg, hummus, olives & crumbled feta', 'Drizzle with olive oil, season to taste'],
    stepTimers: [900, null, null, null, null],
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
    protein: 30,
    carbs: 38,
    fat: 10,
    category: 'dinner',
    tags: ['mexican', 'seafood', 'quick', 'high-protein'],
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
    rating: 4.7,
    isFavourite: false,
    ingredients: [
      { name: 'King prawns', amount: 400, unit: 'g' },
      { name: 'Corn tortillas', amount: 6, unit: 'whole' },
      { name: 'Lime', amount: 2, unit: 'whole' },
      { name: 'Coriander', amount: 1, unit: 'handful' },
      { name: 'Jalape\u00F1o', amount: 1, unit: 'whole' },
      { name: 'Red cabbage', amount: 150, unit: 'g' },
      { name: 'Chilli powder', amount: 1, unit: 'tsp' },
    ],
    steps: ['Toss prawns with chilli powder, salt & lime juice', 'Shred cabbage, slice jalape\u00F1o, chop coriander', 'Heat pan, cook prawns 2-3 min each side', 'Warm tortillas in a dry pan 30 sec per side', 'Build tacos with prawns, cabbage, jalape\u00F1o & lime'],
    stepTimers: [null, null, 300, 60, null],
  },
  {
    id: '9',
    title: 'Jamaican Jerk Chicken',
    subtitle: 'Smoky, spicy island classic',
    cookTime: '35 min',
    prepTime: '20 min',
    servings: 4,
    difficulty: 'Medium',
    calories: 460,
    protein: 42,
    carbs: 14,
    fat: 26,
    category: 'dinner',
    tags: ['caribbean', 'jamaican', 'spicy', 'high-protein', 'grill'],
    image: 'https://images.unsplash.com/photo-1532636721-78a4cd5e1eb8?w=600',
    rating: 4.9,
    isFavourite: false,
    ingredients: [
      { name: 'Chicken thighs', amount: 8, unit: 'whole' },
      { name: 'Scotch bonnet pepper', amount: 1, unit: 'whole' },
      { name: 'Spring onions', amount: 4, unit: 'whole' },
      { name: 'Garlic cloves', amount: 4, unit: 'cloves' },
      { name: 'Fresh thyme', amount: 2, unit: 'tbsp' },
      { name: 'Allspice (ground)', amount: 1, unit: 'tbsp' },
      { name: 'Brown sugar', amount: 2, unit: 'tbsp' },
      { name: 'Soy sauce', amount: 3, unit: 'tbsp' },
      { name: 'Lime', amount: 2, unit: 'whole' },
      { name: 'Ground cinnamon', amount: 0.5, unit: 'tsp' },
    ],
    steps: ['Blend scotch bonnet, spring onions, garlic, thyme, allspice, sugar, soy & lime into marinade', 'Coat chicken, marinate at least 2 hours (overnight is best)', 'Preheat grill or oven to 200\u00B0C / 400\u00B0F', 'Grill chicken 25-30 min, turning, until charred & cooked through', 'Rest 5 min, squeeze fresh lime & serve with rice & peas'],
    stepTimers: [null, 7200, null, 1800, 300],
  },
  {
    id: '10',
    title: 'Caribbean Rice & Peas',
    subtitle: 'Coconut-infused side staple',
    cookTime: '40 min',
    prepTime: '10 min',
    servings: 4,
    difficulty: 'Easy',
    calories: 380,
    protein: 11,
    carbs: 62,
    fat: 10,
    category: 'dinner',
    tags: ['caribbean', 'jamaican', 'vegetarian', 'plant-based', 'side'],
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600',
    rating: 4.7,
    isFavourite: false,
    ingredients: [
      { name: 'Long grain rice', amount: 300, unit: 'g' },
      { name: 'Kidney beans (tinned)', amount: 400, unit: 'g' },
      { name: 'Coconut milk', amount: 400, unit: 'ml' },
      { name: 'Spring onions', amount: 3, unit: 'whole' },
      { name: 'Garlic cloves', amount: 3, unit: 'cloves' },
      { name: 'Fresh thyme', amount: 1, unit: 'tbsp' },
      { name: 'Scotch bonnet pepper', amount: 1, unit: 'whole' },
      { name: 'Allspice berries', amount: 4, unit: 'whole' },
    ],
    steps: ['Saut\u00E9 garlic & spring onions in a pot 2 min', 'Add coconut milk, beans (with liquid), thyme, allspice & whole scotch bonnet', 'Bring to boil, stir in rinsed rice & 200ml water', 'Reduce heat, cover & simmer 25 min until liquid absorbed', 'Remove scotch bonnet, fluff with fork & serve'],
    stepTimers: [120, null, null, 1500, null],
  },
  {
    id: '11',
    title: 'Trinidadian Doubles',
    subtitle: 'Fluffy bara with curried chickpeas',
    cookTime: '30 min',
    prepTime: '90 min',
    servings: 4,
    difficulty: 'Medium',
    calories: 410,
    protein: 14,
    carbs: 58,
    fat: 14,
    category: 'lunch',
    tags: ['caribbean', 'trinidadian', 'vegetarian', 'street-food'],
    image: 'https://images.unsplash.com/photo-1626776877737-c0c2b9c5b6c8?w=600',
    rating: 4.8,
    isFavourite: false,
    ingredients: [
      { name: 'Plain flour', amount: 250, unit: 'g' },
      { name: 'Ground turmeric', amount: 1, unit: 'tsp' },
      { name: 'Instant yeast', amount: 1, unit: 'tsp' },
      { name: 'Chickpeas (tinned)', amount: 800, unit: 'g' },
      { name: 'Curry powder', amount: 2, unit: 'tbsp' },
      { name: 'Onion', amount: 1, unit: 'whole' },
      { name: 'Garlic cloves', amount: 3, unit: 'cloves' },
      { name: 'Scotch bonnet pepper', amount: 1, unit: 'whole' },
      { name: 'Fresh coriander', amount: 1, unit: 'handful' },
    ],
    steps: ['Mix flour, turmeric, yeast, salt & 180ml warm water into soft dough, rest 1-2 hr', 'Saut\u00E9 onion & garlic, add curry powder, bloom 1 min', 'Add chickpeas with liquid, simmer 15 min until thickened', 'Heat oil, fry small flattened dough rounds 30 sec per side until puffed', 'Top each bara with curried chickpeas, scotch bonnet & coriander'],
    stepTimers: [5400, 60, 900, 60, null],
  },
  {
    id: '12',
    title: 'Nigerian Jollof Rice',
    subtitle: 'Smoky tomato-pepper one pot',
    cookTime: '45 min',
    prepTime: '15 min',
    servings: 6,
    difficulty: 'Medium',
    calories: 430,
    protein: 9,
    carbs: 72,
    fat: 12,
    category: 'dinner',
    tags: ['african', 'nigerian', 'west-african', 'one-pot', 'spicy'],
    image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600',
    rating: 4.9,
    isFavourite: true,
    ingredients: [
      { name: 'Long grain rice', amount: 500, unit: 'g' },
      { name: 'Plum tomatoes', amount: 6, unit: 'whole' },
      { name: 'Red bell peppers', amount: 2, unit: 'whole' },
      { name: 'Scotch bonnet pepper', amount: 1, unit: 'whole' },
      { name: 'Onion', amount: 2, unit: 'whole' },
      { name: 'Tomato puree', amount: 3, unit: 'tbsp' },
      { name: 'Vegetable oil', amount: 4, unit: 'tbsp' },
      { name: 'Bay leaves', amount: 2, unit: 'whole' },
      { name: 'Curry powder', amount: 1, unit: 'tbsp' },
      { name: 'Dried thyme', amount: 1, unit: 'tsp' },
    ],
    steps: ['Blend tomatoes, peppers, scotch bonnet & 1 onion until smooth', 'Fry chopped onion in oil 3 min, add tomato puree, fry 5 min', 'Pour in blended sauce, simmer 15 min until oil rises', 'Add curry, thyme, bay & 500ml stock, season well', 'Stir in rinsed rice, cover tightly & cook on low 25 min until tender'],
    stepTimers: [null, 480, 900, null, 1500],
  },
  {
    id: '13',
    title: 'Ethiopian Doro Wat',
    subtitle: 'Rich berbere chicken stew',
    cookTime: '60 min',
    prepTime: '20 min',
    servings: 4,
    difficulty: 'Hard',
    calories: 520,
    protein: 38,
    carbs: 18,
    fat: 32,
    category: 'dinner',
    tags: ['african', 'ethiopian', 'spicy', 'stew', 'high-protein'],
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    rating: 4.8,
    isFavourite: false,
    ingredients: [
      { name: 'Chicken legs', amount: 6, unit: 'whole' },
      { name: 'Red onions', amount: 4, unit: 'whole' },
      { name: 'Berbere spice', amount: 3, unit: 'tbsp' },
      { name: 'Niter kibbeh or ghee', amount: 4, unit: 'tbsp' },
      { name: 'Garlic cloves', amount: 5, unit: 'cloves' },
      { name: 'Fresh ginger', amount: 1, unit: 'tbsp' },
      { name: 'Tomato puree', amount: 2, unit: 'tbsp' },
      { name: 'Lemon', amount: 1, unit: 'whole' },
      { name: 'Hard-boiled eggs', amount: 4, unit: 'whole' },
    ],
    steps: ['Marinate chicken in lemon juice & salt 30 min', 'Slowly cook finely chopped onions dry in pot 20 min until jammy', 'Add ghee, garlic, ginger & berbere, cook 5 min', 'Add chicken & tomato puree, pour in 250ml water, simmer 30 min', 'Score eggs, add to stew last 10 min, serve with injera'],
    stepTimers: [1800, 1200, 300, 1800, 600],
  },
  {
    id: '14',
    title: 'Moroccan Chicken Tagine',
    subtitle: 'Sweet & savoury slow-cooked',
    cookTime: '60 min',
    prepTime: '15 min',
    servings: 4,
    difficulty: 'Medium',
    calories: 470,
    protein: 36,
    carbs: 32,
    fat: 20,
    category: 'dinner',
    tags: ['african', 'moroccan', 'north-african', 'mediterranean', 'high-protein'],
    image: 'https://images.unsplash.com/photo-1547928576-b822bc410bdf?w=600',
    rating: 4.8,
    isFavourite: false,
    ingredients: [
      { name: 'Chicken thighs', amount: 8, unit: 'whole' },
      { name: 'Onion', amount: 2, unit: 'whole' },
      { name: 'Preserved lemon', amount: 1, unit: 'whole' },
      { name: 'Green olives', amount: 100, unit: 'g' },
      { name: 'Ras el hanout', amount: 2, unit: 'tbsp' },
      { name: 'Ground ginger', amount: 1, unit: 'tsp' },
      { name: 'Saffron threads', amount: 1, unit: 'pinch' },
      { name: 'Garlic cloves', amount: 4, unit: 'cloves' },
      { name: 'Fresh coriander', amount: 1, unit: 'handful' },
      { name: 'Olive oil', amount: 3, unit: 'tbsp' },
    ],
    steps: ['Rub chicken with ras el hanout, ginger, salt & olive oil', 'Brown chicken in tagine or heavy pot 5 min per side', 'Add onions & garlic, soften 5 min', 'Add saffron, 250ml water, preserved lemon & olives, cover', 'Simmer low 45 min, top with coriander before serving'],
    stepTimers: [null, 600, 300, null, 2700],
  },
  {
    id: '15',
    title: 'West African Peanut Stew',
    subtitle: 'Creamy, nutty & warming',
    cookTime: '40 min',
    prepTime: '15 min',
    servings: 4,
    difficulty: 'Easy',
    calories: 440,
    protein: 16,
    carbs: 48,
    fat: 22,
    category: 'dinner',
    tags: ['african', 'west-african', 'vegetarian', 'plant-based', 'stew'],
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600',
    rating: 4.7,
    isFavourite: false,
    ingredients: [
      { name: 'Sweet potatoes', amount: 2, unit: 'whole' },
      { name: 'Onion', amount: 1, unit: 'whole' },
      { name: 'Garlic cloves', amount: 3, unit: 'cloves' },
      { name: 'Fresh ginger', amount: 1, unit: 'tbsp' },
      { name: 'Tomato puree', amount: 3, unit: 'tbsp' },
      { name: 'Smooth peanut butter', amount: 150, unit: 'g' },
      { name: 'Vegetable stock', amount: 700, unit: 'ml' },
      { name: 'Kale', amount: 150, unit: 'g' },
      { name: 'Cayenne pepper', amount: 0.5, unit: 'tsp' },
    ],
    steps: ['Saut\u00E9 onion, garlic & ginger in oil 3 min', 'Add tomato puree & cayenne, cook 2 min', 'Stir in cubed sweet potato & stock, simmer 20 min', 'Whisk in peanut butter until creamy', 'Add chopped kale last 5 min, season & serve over rice'],
    stepTimers: [180, 120, 1200, null, 300],
  },
  {
    id: '16',
    title: 'South African Bobotie',
    subtitle: 'Spiced mince with custard top',
    cookTime: '50 min',
    prepTime: '20 min',
    servings: 6,
    difficulty: 'Medium',
    calories: 490,
    protein: 30,
    carbs: 24,
    fat: 28,
    category: 'dinner',
    tags: ['african', 'south-african', 'comfort', 'high-protein'],
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600',
    rating: 4.6,
    isFavourite: false,
    ingredients: [
      { name: 'Beef mince', amount: 750, unit: 'g' },
      { name: 'Onion', amount: 2, unit: 'whole' },
      { name: 'Curry powder', amount: 2, unit: 'tbsp' },
      { name: 'Mango chutney', amount: 3, unit: 'tbsp' },
      { name: 'Sultanas', amount: 60, unit: 'g' },
      { name: 'White bread (slice)', amount: 2, unit: 'slices' },
      { name: 'Milk', amount: 250, unit: 'ml' },
      { name: 'Eggs', amount: 2, unit: 'whole' },
      { name: 'Bay leaves', amount: 4, unit: 'whole' },
      { name: 'Lemon zest', amount: 1, unit: 'tsp' },
    ],
    steps: ['Soak bread in 100ml milk, squeeze, reserve milk', 'Saut\u00E9 onion 5 min, add curry powder 1 min', 'Add mince, brown 8 min, stir in chutney, sultanas, bread, lemon zest', 'Press into baking dish, top with bay leaves', 'Whisk eggs with remaining milk, pour over, bake 180\u00B0C / 350\u00B0F 30 min until set'],
    stepTimers: [null, 360, 480, null, 1800],
  },
  {
    id: '17',
    title: 'Trini Curry Goat',
    subtitle: 'Slow-braised island favourite',
    cookTime: '120 min',
    prepTime: '20 min',
    servings: 4,
    difficulty: 'Medium',
    calories: 560,
    protein: 48,
    carbs: 14,
    fat: 34,
    category: 'dinner',
    tags: ['caribbean', 'trinidadian', 'curry', 'high-protein', 'spicy'],
    image: 'https://images.unsplash.com/photo-1604908554049-2f0a6e7b5d62?w=600',
    rating: 4.8,
    isFavourite: false,
    ingredients: [
      { name: 'Goat shoulder (cubed)', amount: 1, unit: 'kg' },
      { name: 'Caribbean curry powder', amount: 4, unit: 'tbsp' },
      { name: 'Garlic cloves', amount: 6, unit: 'cloves' },
      { name: 'Fresh ginger', amount: 1, unit: 'tbsp' },
      { name: 'Onion', amount: 2, unit: 'whole' },
      { name: 'Scotch bonnet pepper', amount: 1, unit: 'whole' },
      { name: 'Fresh thyme', amount: 1, unit: 'tbsp' },
      { name: 'Lime', amount: 2, unit: 'whole' },
      { name: 'Coconut oil', amount: 3, unit: 'tbsp' },
    ],
    steps: ['Wash goat with lime, season with garlic, ginger, thyme, half the curry powder, marinate 1 hr', 'Heat oil, bloom remaining curry powder 2 min until fragrant', 'Add goat, sear 5 min, add onion & scotch bonnet', 'Pour in 700ml water, cover & simmer low 90 min until tender', 'Uncover last 15 min to thicken sauce, serve with roti'],
    stepTimers: [3600, 120, 300, 5400, 900],
  },
  {
    id: '18',
    title: 'Plantain & Black Bean Bowl',
    subtitle: 'Sweet, savoury & wholesome',
    cookTime: '20 min',
    prepTime: '10 min',
    servings: 2,
    difficulty: 'Easy',
    calories: 420,
    protein: 14,
    carbs: 70,
    fat: 11,
    category: 'lunch',
    tags: ['caribbean', 'african', 'vegetarian', 'plant-based', 'quick', 'whole-foods'],
    image: 'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=600',
    rating: 4.6,
    isFavourite: false,
    ingredients: [
      { name: 'Ripe plantains', amount: 2, unit: 'whole' },
      { name: 'Black beans (tinned)', amount: 400, unit: 'g' },
      { name: 'Brown rice (cooked)', amount: 200, unit: 'g' },
      { name: 'Avocado', amount: 1, unit: 'whole' },
      { name: 'Lime', amount: 1, unit: 'whole' },
      { name: 'Smoked paprika', amount: 1, unit: 'tsp' },
      { name: 'Garlic cloves', amount: 2, unit: 'cloves' },
      { name: 'Coconut oil', amount: 2, unit: 'tbsp' },
      { name: 'Fresh coriander', amount: 1, unit: 'handful' },
    ],
    steps: ['Slice plantains diagonally, fry in coconut oil 3 min per side until caramelised', 'Saut\u00E9 garlic, add black beans with liquid, paprika, simmer 5 min, mash slightly', 'Warm brown rice, divide between bowls', 'Top with beans, plantain, sliced avocado', 'Squeeze lime, scatter coriander & serve'],
    stepTimers: [360, 300, null, null, null],
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
  if (ing.amount === undefined || ing.amount === null) {
    return 'to taste';
  }
  const scaledAmount = ing.amount * multiplier;
  const unit = ing.unit ?? '';
  const conv = IMPERIAL_CONVERSIONS[unit];
  if (system === 'imperial' && conv && conv.factor !== 1) {
    const converted = scaledAmount * conv.factor;
    return `${formatAmount(converted)} ${conv.unit}`;
  }
  const unitLabel = unit === 'whole' || !unit ? '' : unit;
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
  const router = useRouter();
  const params = useLocalSearchParams<{ diet?: string; dietLabel?: string; habitName?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDiet, setActiveDiet] = useState<string | null>(null);
  const [activeDietLabel, setActiveDietLabel] = useState<string | null>(null);
  const [fromHabitName, setFromHabitName] = useState<string | null>(null);

  useEffect(() => {
    if (params.diet && typeof params.diet === 'string') {
      const diet = params.diet.toLowerCase();
      console.log('[Cooking] Diet filter applied from discover:', diet);
      setActiveDiet(diet);
      setActiveDietLabel(typeof params.dietLabel === 'string' ? params.dietLabel : (DIET_LABELS[diet]?.label ?? diet));
      setFromHabitName(typeof params.habitName === 'string' ? params.habitName : null);
      setSelectedCategory('all');
      setSearchQuery('');
    }
  }, [params.diet, params.dietLabel, params.habitName]);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>(TODAYS_MEAL_PLAN);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [servingOverrides, setServingOverrides] = useState<Record<string, number>>({});
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  const [cookingRecipeId, setCookingRecipeId] = useState<string | null>(null);
  const [cookStep, setCookStep] = useState<number>(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [shoppingOpen, setShoppingOpen] = useState<boolean>(false);
  const [shoppingList, setShoppingList] = useState<{ id: string; recipeId: string; name: string; amount: string; checked: boolean }[]>([]);

  const cookingRecipe = useMemo(() => recipes.find(r => r.id === cookingRecipeId) ?? null, [recipes, cookingRecipeId]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          setTimerRunning(false);
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const startCooking = useCallback((recipe: Recipe) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCookingRecipeId(recipe.id);
    setCookStep(0);
    setCheckedIngredients({});
    const initial = recipe.stepTimers?.[0];
    setTimerSeconds(initial ?? 0);
    setTimerRunning(false);
  }, []);

  const closeCooking = useCallback(() => {
    setCookingRecipeId(null);
    setTimerRunning(false);
    setTimerSeconds(0);
  }, []);

  const goToStep = useCallback((recipe: Recipe, step: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const clamped = Math.max(0, Math.min(recipe.steps.length - 1, step));
    setCookStep(clamped);
    const t = recipe.stepTimers?.[clamped];
    setTimerSeconds(t ?? 0);
    setTimerRunning(false);
  }, []);

  const toggleIngredientChecked = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setCheckedIngredients(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const addToShoppingList = useCallback((recipe: Recipe, multiplier: number) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShoppingList(prev => {
      const existing = new Set(prev.filter(i => i.recipeId === recipe.id).map(i => i.name));
      const newItems = recipe.ingredients
        .filter(i => !existing.has(i.name))
        .map(i => ({
          id: `${recipe.id}-${i.name}-${Date.now()}-${Math.random()}`,
          recipeId: recipe.id,
          name: i.name,
          amount: formatIngredient(i, multiplier, unitSystem),
          checked: false,
        }));
      return [...prev, ...newItems];
    });
  }, [unitSystem]);

  const toggleShoppingItem = useCallback((id: string) => {
    void Haptics.selectionAsync();
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }, []);

  const removeShoppingItem = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShoppingList(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCheckedShopping = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShoppingList(prev => prev.filter(i => !i.checked));
  }, []);

  const shareRecipe = useCallback(async (recipe: Recipe) => {
    try {
      const text = `${recipe.title}\n\n${recipe.subtitle}\n\nIngredients:\n${recipe.ingredients.map(i => `• ${formatIngredient(i, 1, unitSystem)} ${i.name}`).join('\n')}\n\nSteps:\n${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      await Share.share({ message: text, title: recipe.title });
    } catch (e) {
      console.log('[Cooking] share failed', e);
    }
  }, [unitSystem]);

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
    if (activeDiet) {
      filtered = filtered.filter(r => r.tags.includes(activeDiet));
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory || r.tags.includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some(t => t.includes(q)) ||
        r.ingredients.some((i: Ingredient) => i.name.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [recipes, selectedCategory, searchQuery, activeDiet]);

  const clearDiet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDiet(null);
    setActiveDietLabel(null);
    setFromHabitName(null);
    router.setParams({ diet: '', dietLabel: '', habitName: '' });
  }, [router]);

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
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShoppingOpen(true);
            }}
            testID="open-shopping-list"
          >
            <ShoppingBasket size={20} color={accentColor} />
            {shoppingList.filter(i => !i.checked).length > 0 && (
              <View style={[styles.badge, { backgroundColor: accentColor }]}>
                <Text style={styles.badgeText}>{shoppingList.filter(i => !i.checked).length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {activeDiet && (
          <View style={[styles.dietBanner, { borderColor: accentColor + '40' }]} testID="diet-banner">
            <LinearGradient
              colors={[accentColor + '20', accentColor + '08']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.dietBannerEmoji, { backgroundColor: accentColor + '25' }]}>
              <Text style={styles.dietBannerEmojiText}>{DIET_LABELS[activeDiet]?.emoji ?? '\uD83C\uDF7D\uFE0F'}</Text>
            </View>
            <View style={styles.dietBannerContent}>
              <Text style={[styles.dietBannerLabel, { color: subtleText }]}>
                {fromHabitName ? `From “${fromHabitName}”` : 'Diet'}
              </Text>
              <Text style={[styles.dietBannerTitle, { color: mainText }]} numberOfLines={1}>
                {activeDietLabel ?? DIET_LABELS[activeDiet]?.label ?? activeDiet}
              </Text>
              <Text style={[styles.dietBannerTagline, { color: subtleText }]} numberOfLines={1}>
                {DIET_LABELS[activeDiet]?.tagline ?? 'Curated recipes for your habit'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.dietBannerClose, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={clearDiet}
              testID="clear-diet"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={14} color={mainText} />
            </TouchableOpacity>
          </View>
        )}

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
                      <View style={styles.macroRow}>
                        <View style={[styles.macroPill, { backgroundColor: '#FF634715' }]}>
                          <Text style={[styles.macroText, { color: '#FF6347' }]}>Protein {recipe.protein}g</Text>
                        </View>
                        <View style={[styles.macroPill, { backgroundColor: '#F59E0B15' }]}>
                          <Text style={[styles.macroText, { color: '#F59E0B' }]}>Carbs {recipe.carbs}g</Text>
                        </View>
                        <View style={[styles.macroPill, { backgroundColor: '#34C75915' }]}>
                          <Text style={[styles.macroText, { color: '#34C759' }]}>Fat {recipe.fat}g</Text>
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

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.primaryAction, { backgroundColor: accentColor }]}
                          onPress={(e) => { e.stopPropagation(); startCooking(recipe); }}
                          testID={`start-cooking-${recipe.id}`}
                        >
                          <ChefHat size={16} color="#FFFFFF" />
                          <Text style={styles.primaryActionText}>Start Cooking</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.secondaryAction, { backgroundColor: secondaryBg, borderColor: cardBorder }]}
                          onPress={(e) => { e.stopPropagation(); addToShoppingList(recipe, multiplier); }}
                          testID={`add-shopping-${recipe.id}`}
                        >
                          <ShoppingBasket size={16} color={accentColor} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.secondaryAction, { backgroundColor: secondaryBg, borderColor: cardBorder }]}
                          onPress={(e) => { e.stopPropagation(); void shareRecipe(recipe); }}
                          testID={`share-${recipe.id}`}
                        >
                          <Share2 size={16} color={accentColor} />
                        </TouchableOpacity>
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

      <Modal
        visible={cookingRecipe !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCooking}
      >
        {cookingRecipe && (() => {
          const r = cookingRecipe;
          const currentServings = servingOverrides[r.id] ?? r.servings;
          const multiplier = currentServings / r.servings;
          const totalSteps = r.steps.length;
          const progress = (cookStep + 1) / totalSteps;
          const stepTimer = r.stepTimers?.[cookStep];
          const mins = Math.floor(timerSeconds / 60);
          const secs = timerSeconds % 60;
          return (
            <View style={[styles.cookContainer, { backgroundColor: warmBg }]}>
              <View style={[styles.cookHeader, { paddingTop: insets.top + 8, borderBottomColor: cardBorder }]}>
                <TouchableOpacity
                  style={[styles.cookClose, { backgroundColor: secondaryBg }]}
                  onPress={closeCooking}
                  testID="close-cooking"
                >
                  <X size={20} color={mainText} />
                </TouchableOpacity>
                <View style={styles.cookHeaderCenter}>
                  <Text style={[styles.cookHeaderTitle, { color: mainText }]} numberOfLines={1}>{r.title}</Text>
                  <Text style={[styles.cookHeaderSub, { color: subtleText }]}>Step {cookStep + 1} of {totalSteps}</Text>
                </View>
                <View style={{ width: 40 }} />
              </View>

              <View style={[styles.cookProgressBg, { backgroundColor: cardBorder }]}>
                <View style={[styles.cookProgressFill, { backgroundColor: accentColor, width: `${progress * 100}%` as any }]} />
              </View>

              <ScrollView contentContainerStyle={styles.cookScroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.cookStepCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={[styles.cookStepBadge, { backgroundColor: accentColor }]}>
                    <Text style={styles.cookStepBadgeText}>{cookStep + 1}</Text>
                  </View>
                  <Text style={[styles.cookStepText, { color: mainText }]}>{r.steps[cookStep]}</Text>
                </View>

                {stepTimer != null && stepTimer > 0 && (
                  <View style={[styles.cookTimerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <View style={styles.cookTimerHeader}>
                      <Timer size={16} color={accentColor} />
                      <Text style={[styles.cookTimerLabel, { color: subtleText }]}>Suggested timer</Text>
                    </View>
                    <Text style={[styles.cookTimerValue, { color: timerSeconds === 0 && timerRunning === false ? '#34C759' : mainText }]}>
                      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                    </Text>
                    <View style={styles.cookTimerControls}>
                      <TouchableOpacity
                        style={[styles.cookTimerBtn, { backgroundColor: accentColor }]}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          if (timerSeconds === 0) {
                            setTimerSeconds(stepTimer);
                          }
                          setTimerRunning(x => !x);
                        }}
                        testID="timer-toggle"
                      >
                        {timerRunning ? <Pause size={18} color="#FFFFFF" /> : <Play size={18} color="#FFFFFF" />}
                        <Text style={styles.cookTimerBtnText}>{timerRunning ? 'Pause' : (timerSeconds === 0 ? 'Start' : 'Resume')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cookTimerReset, { backgroundColor: secondaryBg, borderColor: cardBorder }]}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setTimerRunning(false);
                          setTimerSeconds(stepTimer);
                        }}
                      >
                        <RotateCcw size={16} color={mainText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.cookSectionHeader}>
                  <ClipboardList size={16} color={accentColor} />
                  <Text style={[styles.cookSectionTitle, { color: mainText }]}>Ingredients</Text>
                  <Text style={[styles.cookSectionHint, { color: subtleText }]}>Tap to check off</Text>
                </View>
                {r.ingredients.map((ing, i) => {
                  const key = `${r.id}-${i}`;
                  const checked = !!checkedIngredients[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.cookIngRow, { backgroundColor: cardBg, borderColor: cardBorder }]}
                      onPress={() => toggleIngredientChecked(key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.cookCheck, { backgroundColor: checked ? '#34C759' : 'transparent', borderColor: checked ? '#34C759' : cardBorder }]}>
                        {checked && <Check size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.cookIngName, { color: mainText, opacity: checked ? 0.45 : 1, textDecorationLine: checked ? 'line-through' : 'none' }]}>{ing.name}</Text>
                      <View style={[styles.amountBadge, { backgroundColor: accentLight }]}>
                        <Text style={[styles.amountBadgeText, { color: accentColor }]}>{formatIngredient(ing, multiplier, unitSystem)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.cookNav, { paddingBottom: insets.bottom + 12, backgroundColor: cardBg, borderTopColor: cardBorder }]}>
                <TouchableOpacity
                  style={[styles.cookNavBtn, { backgroundColor: secondaryBg, borderColor: cardBorder, opacity: cookStep === 0 ? 0.4 : 1 }]}
                  disabled={cookStep === 0}
                  onPress={() => goToStep(r, cookStep - 1)}
                  testID="prev-step"
                >
                  <ChevronLeft size={18} color={mainText} />
                  <Text style={[styles.cookNavBtnText, { color: mainText }]}>Back</Text>
                </TouchableOpacity>
                {cookStep < totalSteps - 1 ? (
                  <TouchableOpacity
                    style={[styles.cookNavPrimary, { backgroundColor: accentColor }]}
                    onPress={() => goToStep(r, cookStep + 1)}
                    testID="next-step"
                  >
                    <Text style={styles.cookNavPrimaryText}>Next Step</Text>
                    <ChevronRight size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.cookNavPrimary, { backgroundColor: '#34C759' }]}
                    onPress={() => {
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      closeCooking();
                    }}
                    testID="finish-cooking"
                  >
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.cookNavPrimaryText}>Done!</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })()}
      </Modal>

      <Modal
        visible={shoppingOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShoppingOpen(false)}
      >
        <View style={[styles.cookContainer, { backgroundColor: warmBg }]}>
          <View style={[styles.cookHeader, { paddingTop: insets.top + 8, borderBottomColor: cardBorder }]}>
            <TouchableOpacity
              style={[styles.cookClose, { backgroundColor: secondaryBg }]}
              onPress={() => setShoppingOpen(false)}
              testID="close-shopping"
            >
              <X size={20} color={mainText} />
            </TouchableOpacity>
            <View style={styles.cookHeaderCenter}>
              <Text style={[styles.cookHeaderTitle, { color: mainText }]}>Shopping List</Text>
              <Text style={[styles.cookHeaderSub, { color: subtleText }]}>
                {shoppingList.filter(i => !i.checked).length} to buy · {shoppingList.filter(i => i.checked).length} done
              </Text>
            </View>
            {shoppingList.some(i => i.checked) ? (
              <TouchableOpacity
                style={[styles.cookClose, { backgroundColor: secondaryBg }]}
                onPress={clearCheckedShopping}
              >
                <Trash2 size={18} color={mainText} />
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}
          </View>

          <ScrollView contentContainerStyle={styles.cookScroll} showsVerticalScrollIndicator={false}>
            {shoppingList.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: cardBorder, marginHorizontal: 0 }]}>
                <ShoppingBasket size={32} color={subtleText} />
                <Text style={[styles.emptyTitle, { color: mainText }]}>Your list is empty</Text>
                <Text style={[styles.emptyText, { color: subtleText }]}>Open a recipe and tap the basket icon to add ingredients</Text>
              </View>
            ) : (
              Object.entries(
                shoppingList.reduce<Record<string, typeof shoppingList>>((acc, item) => {
                  const r = recipes.find(x => x.id === item.recipeId);
                  const name = r?.title ?? 'Other';
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(item);
                  return acc;
                }, {})
              ).map(([recipeName, items]) => (
                <View key={recipeName} style={{ marginBottom: 20 }}>
                  <Text style={[styles.shopGroupTitle, { color: subtleText }]}>{recipeName}</Text>
                  {items.map(item => (
                    <View key={item.id} style={[styles.shopRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <TouchableOpacity
                        style={styles.shopRowMain}
                        onPress={() => toggleShoppingItem(item.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.cookCheck, { backgroundColor: item.checked ? '#34C759' : 'transparent', borderColor: item.checked ? '#34C759' : cardBorder }]}>
                          {item.checked && <Check size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.cookIngName, { color: mainText, opacity: item.checked ? 0.45 : 1, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.name}</Text>
                        <Text style={[styles.shopAmount, { color: subtleText }]}>{item.amount}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeShoppingItem(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={16} color={subtleText} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  macroPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  macroText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  secondaryAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookContainer: {
    flex: 1,
  },
  cookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cookClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  cookHeaderTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cookHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  cookProgressBg: {
    height: 3,
    width: '100%',
  },
  cookProgressFill: {
    height: '100%',
  },
  cookScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  cookStepCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  cookStepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cookStepBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cookStepText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500' as const,
  },
  cookTimerCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  cookTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cookTimerLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  cookTimerValue: {
    fontSize: 44,
    fontWeight: '700' as const,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    marginBottom: 14,
  },
  cookTimerControls: {
    flexDirection: 'row',
    gap: 8,
  },
  cookTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
  },
  cookTimerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  cookTimerReset: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  cookSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  cookSectionHint: {
    fontSize: 11,
  },
  cookIngRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  cookCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookIngName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  cookNav: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cookNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  cookNavBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cookNavPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 14,
  },
  cookNavPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  shopGroupTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  shopRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shopAmount: {
    fontSize: 12,
    fontWeight: '600' as const,
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
  dietBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    gap: 12,
  },
  dietBannerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietBannerEmojiText: {
    fontSize: 22,
  },
  dietBannerContent: {
    flex: 1,
  },
  dietBannerLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  dietBannerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  dietBannerTagline: {
    fontSize: 12,
    marginTop: 1,
  },
  dietBannerClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
