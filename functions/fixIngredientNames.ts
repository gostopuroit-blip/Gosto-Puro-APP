import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Wrong ingredient names → correct Italian name (exact lowercase match)
const EXACT_CORRECTIONS = {
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

// Also fix ingredients containing these words anywhere
const PARTIAL_CORRECTIONS = [
  { wrong: "vendita", right: "sale" },
  { wrong: "asino", right: "zucchero" },
];

function fixIngredient(name) {
  if (!name) return name;
  const lower = name.trim().toLowerCase();

  // Exact match
  if (EXACT_CORRECTIONS[lower]) return EXACT_CORRECTIONS[lower];

  // Partial match — if ingredient name contains a wrong word standalone
  for (const { wrong, right } of PARTIAL_CORRECTIONS) {
    // Match whole word (e.g. "Sale vendita" → "sale")
    const regex = new RegExp(`\\b${wrong}\\b`, 'i');
    if (regex.test(name)) return right;
  }

  return name;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const recipes = await base44.asServiceRole.entities.Recipe.list("-created_date", 1000);

    const fixedList = [];

    for (const recipe of recipes) {
      if (!recipe.ingredients || recipe.ingredients.length === 0) continue;

      let hasChange = false;
      const fixedIngredients = recipe.ingredients.map(ing => {
        if (!ing.name) return ing;
        const corrected = fixIngredient(ing.name);
        if (corrected !== ing.name) {
          hasChange = true;
          return { ...ing, name: corrected };
        }
        return ing;
      });

      if (hasChange) {
        await base44.asServiceRole.entities.Recipe.update(recipe.id, {
          ingredients: fixedIngredients,
        });
        const wrongOnes = recipe.ingredients
          .filter(ing => fixIngredient(ing.name) !== ing.name)
          .map(ing => `"${ing.name}" → "${fixIngredient(ing.name)}"`);
        fixedList.push({ title: recipe.title, fixes: wrongOnes });
      }
    }

    return Response.json({
      success: true,
      total_checked: recipes.length,
      total_fixed: fixedList.length,
      details: fixedList,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});