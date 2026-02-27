import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Common wrong ingredient names → correct Italian
const CORRECTIONS = {
  // "sale" (salt) wrongly translated
  "vendita": "sale",
  "sell": "sale",
  "salt": "sale",
  "venta": "sale",
  "salita": "sale",
  "saldo": "sale",
  "salato": "sale",
  // "zucchero" (sugar) wrongly translated
  "asino": "zucchero",
  "sugar": "zucchero",
  "azúcar": "zucchero",
  "sucre": "zucchero",
  "açúcar": "zucchero",
  // "burro" (butter)
  "butter": "burro",
  // "farina" (flour)
  "flour": "farina",
  // "uova" / "uovo" (eggs)
  "eggs": "uova",
  "egg": "uovo",
  // "latte" (milk)
  "milk": "latte",
  // "olio" (oil)
  "oil": "olio",
  // "panna" (cream)
  "cream": "panna",
  // "acqua" (water)
  "water": "acqua",
  // "pepe" (pepper)
  "pepper": "pepe",
  // "aglio" (garlic)
  "garlic": "aglio",
  // "cipolla" (onion)
  "onion": "cipolla",
  // "pomodoro" (tomato)
  "tomato": "pomodoro",
  // other common wrong words
  "asinine": "zucchero",
  "donkey": "zucchero",
};

function fixIngredient(name) {
  if (!name) return name;
  const lower = name.trim().toLowerCase();
  if (CORRECTIONS[lower]) return CORRECTIONS[lower];
  return name;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load all recipes
    const recipes = await base44.asServiceRole.entities.Recipe.list("-created_date", 1000);

    let fixedCount = 0;
    let checkedCount = 0;

    for (const recipe of recipes) {
      if (!recipe.ingredients || recipe.ingredients.length === 0) continue;
      checkedCount++;

      let hasChange = false;
      const fixedIngredients = recipe.ingredients.map(ing => {
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
        fixedCount++;
      }
    }

    return Response.json({
      success: true,
      checked: checkedCount,
      fixed: fixedCount,
      message: `Corrette ${fixedCount} ricette su ${checkedCount} controllate.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});