import type { CookingRecipe } from '@/constants/cooking/recipeTypes';
import type { KitchenRecipeDto } from '@/types/kitchenRecipe';

export function kitchenDtoToGuidedRecipe(dto: KitchenRecipeDto): CookingRecipe {
  const mins = dto.readyInMinutes || 30;
  const prep = parseInt(dto.prepTime, 10) || Math.round(mins * 0.35);
  return {
    id: dto.id,
    title: dto.title,
    description: dto.summary || dto.subtitle,
    image: dto.image,
    minutes: mins,
    prepMinutes: prep,
    servings: dto.servings,
    difficulty: dto.difficulty,
    tags: dto.tags,
    ingredients: dto.ingredients,
    steps: dto.steps.length ? dto.steps : ['Follow the recipe summary and ingredients to cook this dish.'],
    nutrition: dto.nutrition ?? {
      calories: dto.calories,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
    category: dto.category,
    rating: dto.rating,
  };
}

export function parseSpoonacularId(recipeId: string): number | null {
  if (!recipeId.startsWith('sp-')) return null;
  const n = Number(recipeId.slice(3));
  return Number.isFinite(n) && n > 0 ? n : null;
}
