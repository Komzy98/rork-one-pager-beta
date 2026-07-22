import fs from 'fs';

const text = fs.readFileSync('/tmp/old_cooking.tsx', 'utf8');
const start = text.indexOf('// ── English & British');
const end = text.indexOf('// ── Nigerian', start);
const section = text.slice(start, end);
const raw = section.replace(/^[\s\S]*?\/\/ ── English[^\n]*\n/, '');
const objects = [];
let depth = 0;
let cur = '';
let inObj = false;
for (let i = 0; i < raw.length; i++) {
  const ch = raw[i];
  if (!inObj && raw.slice(i, i + 3) === '  {') {
    inObj = true;
    cur = '  {';
    depth = 1;
    i += 2;
    continue;
  }
  if (!inObj) continue;
  cur += ch;
  if (ch === '{') depth++;
  if (ch === '}') {
    depth--;
    if (depth === 0) {
      objects.push(cur);
      cur = '';
      inObj = false;
    }
  }
}

const recipes = objects.map((o) => {
  const fn = new Function(`return (${o.replace(/;$/, '')})`);
  return fn();
});

function toCooking(r) {
  const prep = parseInt(r.prepTime, 10) || 10;
  const cook = parseInt(r.cookTime, 10) || 20;
  return {
    id: r.id,
    title: r.title,
    description: r.subtitle,
    image: r.image,
    minutes: prep + cook,
    prepMinutes: prep,
    servings: r.servings,
    difficulty: r.difficulty,
    tags: r.tags,
    ingredients: r.ingredients,
    steps: r.steps,
    nutrition: { calories: r.calories, protein: 0, carbs: 0, fat: 0 },
    category: r.category,
    rating: r.rating,
  };
}

const out = `import type { CookingRecipe } from './recipeTypes';

/** English & British classics (legacy Kitchen tab). */
export const BRITISH_ENGLISH_RECIPES: CookingRecipe[] = ${JSON.stringify(recipes.map(toCooking), null, 2)} as CookingRecipe[];
`;

fs.writeFileSync(new URL('../constants/cooking/britishEnglishRecipes.ts', import.meta.url), out);
console.log('wrote', recipes.length, 'recipes');
