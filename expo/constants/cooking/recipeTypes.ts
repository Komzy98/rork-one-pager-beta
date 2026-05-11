/** Shared cooking recipe model (library + guided mode + filters). */
export type RecipeNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type CookingRecipe = {
  id: string;
  title: string;
  description: string;
  image: string;
  /** Total active time estimate (prep + cook), minutes */
  minutes: number;
  prepMinutes?: number;
  servings?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  ingredients: string[];
  steps: string[];
  stepTimers?: (number | null)[];
  stepHints?: string[];
  nutrition: RecipeNutrition;
  category?: string;
  rating?: number;
};
