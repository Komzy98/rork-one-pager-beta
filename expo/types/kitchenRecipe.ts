/** Normalized recipe for the Kitchen tab (local + Spoonacular). */
export type KitchenRecipeDto = {
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
  source: 'spoonacular';
};

export type KitchenRecipeSearchResult = {
  recipes: KitchenRecipeDto[];
  totalResults: number;
};
