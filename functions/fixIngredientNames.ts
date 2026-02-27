import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Wrong ingredient names → correct Italian name
const CORRECTIONS = {
  "vendita": "sale",
  "sell": "sale",
  "salt": "sale",
  "venta": "sale",
  "salita": "sale",
  "asino": "zucchero",
  "sugar": "zucchero",
  "açúcar": "zucchero",
  "azúcar": "zucchero",
  "butter": "burro",
  "flour": "farina",
  "eggs": "uova",
  "egg": "uovo",
  "milk": "latte",
  "oil": "olio",
  "cream": "panna",
  "water": "acqua",
  "pepper": "pepe",
  "garlic": "aglio",
  "onion": "cipolla",
  "tomato": "pomodoro",
  "tomatoes": "pomodori",
};

function fixIngredient(name) {
  if (!name) return name;
  const lower = name.trim().toLowerCase();
  return CORRECTIONS[lower] || name;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const wrongWords = Object.keys(CORRECTIONS);
    let fixedRecipes = [];
    let totalFixed = 0;

    // Load all recipes in batches
    const recipes = await base44.asServiceRole.entities.Recipe.list("-created_date", 1000);

    for (const recipe of recipes) {
      if (!recipe.ingredients || recipe.ingredients.length === 0) continue;

      let hasChange = false;
      const fixedIngredients = recipe.ingredients.map(ing => {
        if (!ing.name) return ing;
        const lower = ing.name.trim().toLowerCase();
        if (wrongWords.includes(lower)) {
          hasChange = true;
          return { ...ing, name: CORRECTIONS[lower] };
        }
        return ing;
      });

      if (hasChange) {
        await base44.asServiceRole.entities.Recipe.update(recipe.id, {
          ingredients: fixedIngredients,
        });
        fixedRecipes.push({ id: recipe.id, title: recipe.title });
        totalFixed++;
      }
    }

    return Response.json({
      success: true,
      total_recipes_checked: recipes.length,
      recipes_fixed: totalFixed,
      fixed_list: fixedRecipes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});