# Kitchen tab (Spoonacular)

The Cooking tab is **API-first**: hero, curated rails, search, and recipe detail all come from Spoonacular via tRPC. The API key stays on the server only.

## Environment variables

Local (`expo/.env`):

```bash
SPOONACULAR_API_KEY=<your-spoonacular-key>
```

Production (Railway / API host): set the same variable on the backend service.

Restart Metro and the API server after changing env vars.

## tRPC routes

| Route | Purpose |
|--------|---------|
| `cooking.getBundle` | Hero + curated rails (African, British, quick, healthy, …) |
| `cooking.searchRecipes` | Search and collection filters |
| `cooking.getRecipe` | Full ingredients, steps, nutrition |
| `cooking.isConfigured` | Whether the server has a key |

## App behaviour

- **For you** — premium home feed from `getBundle`
- **African / British pills** — editorial library recipes (jollof, jerk, fish & chips, etc.) merged with Spoonacular when available
- **Collection pills** — live filtered search (2+ characters clears the pill filter)
- **Search** — popularity-ranked Spoonacular + curated matches
- **Recipe sheet** — summary, diets, macros, ingredients, method
- **Guided cook** — step-by-step mode with timers

Apply for a key at [spoonacular.com/food-api](https://spoonacular.com/food-api).
