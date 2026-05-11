import type { Habit, UserProfile } from '@/types/habit';
import { COOKING_RECIPES, type CookingRecipe } from '@/constants/cookingRecipes';
import { getNationalitySignals } from '@/utils/nationalityPersonalization';

const FOOD_KEYS =
  /\b(cook|meal|eat|diet|keto|carb|protein|fast|nutrition|vegan|veg|prep|sugar|calorie|food|kitchen|recipe|healthy|intermittent|fasting|water|hydrat|snack|breakfast|lunch|dinner)\b/i;

export function habitLooksNutritionRelated(h: Habit): boolean {
  const blob = `${h.name || ''} ${h.description || ''} ${h.mainGoal || ''}`.toLowerCase();
  return FOOD_KEYS.test(blob) || Boolean(h.dietTags?.length);
}

/** Last N calendar days YYYY-MM-DD */
export function recentCompletionDates(habit: Habit, days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (habit.completions[key]) out.push(key);
  }
  return out;
}

export function countNutritionHabitCompletionsLast7Days(habits: Habit[]): number {
  const relevant = habits.filter(habitLooksNutritionRelated);
  let n = 0;
  for (const h of relevant) {
    n += recentCompletionDates(h, 7).length;
  }
  return n;
}

export function collectUserRecipeTags(
  profile: UserProfile | null | undefined,
  habits: Habit[],
  routeDiet?: string,
): string[] {
  const set = new Set<string>();
  if (routeDiet) set.add(routeDiet.toLowerCase().trim());

  const interests = profile?.interests ?? [];
  for (const i of interests) {
    const t = i.toLowerCase().trim();
    if (t.includes('cook') || t.includes('food') || t.includes('nutrition')) {
      set.add('healthy');
    }
    if (t.includes('vegan') || t.includes('plant')) set.add('plant-based');
    if (t.includes('keto')) set.add('keto-friendly');
  }

  const nat = getNationalitySignals(profile);
  for (const t of nat.recipeTags) set.add(t.toLowerCase());

  for (const h of habits) {
    if (h.dietTags) {
      for (const d of h.dietTags) set.add(d.toLowerCase());
    }
    if (h.dietLabel) {
      const words = h.dietLabel.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      for (const w of words) {
        if (w.length >= 4) set.add(w);
      }
    }
    if (habitLooksNutritionRelated(h)) {
      const blob = `${h.name} ${h.description || ''}`.toLowerCase();
      if (blob.includes('keto')) set.add('keto-friendly');
      if (blob.includes('low carb') || blob.includes('low-carb')) set.add('low-carb');
      if (blob.includes('mediterranean')) set.add('mediterranean');
      if (blob.includes('vegan') || blob.includes('plant')) set.add('plant-based');
      if (blob.includes('protein')) set.add('high-protein');
    }
  }

  return Array.from(set).filter(Boolean);
}

export function scoreRecipeForUser(recipe: CookingRecipe, userTags: string[], routeDiet?: string): number {
  const rtags = recipe.tags.map((t) => t.toLowerCase());
  let score = 0;
  for (const ut of userTags) {
    if (!ut) continue;
    if (rtags.some((t) => t.includes(ut) || ut.includes(t))) score += 3;
  }
  if (routeDiet) {
    const d = routeDiet.toLowerCase();
    if (rtags.some((t) => t.includes(d) || d.includes(t))) score += 5;
  }
  if (recipe.minutes <= 25) score += 1;
  return score;
}

export function pickTonightRecipe(
  recipes: CookingRecipe[],
  userTags: string[],
  routeDiet?: string,
): CookingRecipe {
  if (recipes.length === 0) return COOKING_RECIPES[0];
  const scored = recipes.map((r) => ({
    r,
    s: scoreRecipeForUser(r, userTags, routeDiet),
  }));
  scored.sort((a, b) => b.s - a.s || a.r.title.localeCompare(b.r.title));
  return scored[0]?.r ?? recipes[0];
}

export function confidenceLabelFromCompletions(completions7: number): { label: string; pct: number } {
  const pct = Math.min(95, Math.round(40 + completions7 * 8));
  const label = completions7 >= 5 ? 'High' : completions7 >= 2 ? 'Medium' : 'Building';
  return { label, pct };
}
