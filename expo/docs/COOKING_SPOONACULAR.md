# Kitchen tab (Spoonacular)

The Cooking tab searches and loads full recipes through the backend (`cooking.searchRecipes`, `cooking.getRecipe`, `cooking.randomRecipes`). The Spoonacular API key stays on the server only.

## Environment variables

Local (`expo/.env`):

```bash
SPOONACULAR_API_KEY=<your-spoonacular-key>
```

Production (Railway / API host): set the same variable on the backend service.

Restart Metro and the API server after changing env vars.

## Behaviour

- **Search** (2+ characters) and **category chips** (except “All”) fetch live recipes from Spoonacular and merge with the built-in library.
- **Hero pick** uses a daily random main course when the API is configured.
- Expanding a Spoonacular recipe loads ingredients and steps on demand.

Apply for a key at [spoonacular.com/food-api](https://spoonacular.com/food-api).
