/** Normalized recipe for the Kitchen tab (Spoonacular). */
export type KitchenRecipeNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type KitchenRecipeDto = {
  id: string;
  spoonacularId: number;
  title: string;
  subtitle: string;
  summary: string;
  cookTime: string;
  prepTime: string;
  readyInMinutes: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: number;
  category: string;
  tags: string[];
  diets: string[];
  cuisines: string[];
  dishTypes: string[];
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  healthScore?: number;
  image: string;
  rating: number;
  ingredients: string[];
  steps: string[];
  nutrition?: KitchenRecipeNutrition;
  source: 'spoonacular' | 'curated';
};

export type KitchenRecipeSearchResult = {
  recipes: KitchenRecipeDto[];
  totalResults: number;
};

export type KitchenCollectionDto = {
  id: string;
  title: string;
  subtitle: string;
  recipes: KitchenRecipeDto[];
};

export type KitchenBundleDto = {
  hero: KitchenRecipeDto;
  collections: KitchenCollectionDto[];
};
