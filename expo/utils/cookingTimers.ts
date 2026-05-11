import type { CookingRecipe } from '@/constants/cookingRecipes';

export function getStepTimerDefault(recipe: CookingRecipe, stepIndex: number): number | null {
  const t = recipe.stepTimers?.[stepIndex];
  if (t == null || !Number.isFinite(t) || t <= 0) return null;
  return Math.floor(t);
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
