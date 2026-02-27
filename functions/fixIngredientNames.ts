import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Dicionário completo de correções — palavra errada → palavra correta em italiano
const CORRECTIONS = {
  // Inglês → Italiano
  "salt": "sale",
  "sell": "sale",
  "sugar": "zucchero",
  "brown sugar": "zucchero di canna",
  "butter": "burro",
  "flour": "farina 00",
  "egg": "uovo",
  "eggs": "uova",
  "milk": "latte",
  "oil": "olio extravergine di oliva",
  "olive oil": "olio extravergine di oliva",
  "cream": "panna",
  "water": "acqua",
  "pepper": "pepe",
  "garlic": "aglio",
  "onion": "cipolla",
  "tomato": "pomodoro",
  "tomatoes": "pomodori",
  "honey": "miele",
  "cheese": "formaggio",
  "rice": "riso",
  "pasta": "pasta",
  "bread": "pane",
  "lemon": "limone",
  "orange": "arancia",
  "apple": "mela",
  "apples": "mele",
  "carrot": "carota",
  "carrots": "carote",
  "potato": "patata",
  "potatoes": "patate",
  "spinach": "spinaci",
  "basil": "basilico",
  "oregano": "origano",
  "rosemary": "rosmarino",
  "thyme": "timo",
  "parsley": "prezzemolo",
  "cinnamon": "cannella",
  "vanilla": "vaniglia",
  "chocolate": "cioccolato",
  "almonds": "mandorle",
  "walnuts": "noci",
  "hazelnuts": "nocciole",
  "pine nuts": "pinoli",
  "raisins": "uvetta",
  "yeast": "lievito",
  "baking powder": "lievito in polvere",
  "vinegar": "aceto",
  "wine": "vino",
  "broth": "brodo",
  "stock": "brodo",
  "chicken": "pollo",
  "beef": "manzo",
  "pork": "maiale",
  "fish": "pesce",
  "salmon": "salmone",
  "tuna": "tonno",
  "shrimp": "gamberi",
  "mushrooms": "funghi",
  "zucchini": "zucchine",
  "eggplant": "melanzane",
  "pepper (vegetable)": "peperone",
  "peppers": "peperoni",
  // Parole non alimentari note
  "vendita": "sale",
  "venta": "sale",
  "salita": "sale",
  "asino": "zucchero",
  // Portoghese/Spagnolo → Italiano
  "açúcar": "zucchero",
  "azúcar": "zucchero",
  "sal": "sale",
  "farinha": "farina 00",
  "leite": "latte",
  "manteiga": "burro",
  "ovos": "uova",
  "ovo": "uovo",
  "azeite": "olio extravergine di oliva",
  "água": "acqua",
  "limão": "limone",
  "cebola": "cipolla",
  "alho": "aglio",
  "tomate": "pomodoro",
  "tomates": "pomodori",
  "canela": "cannella",
  "mel": "miele",
  "nata": "panna",
  "harina": "farina 00",
  "mantequilla": "burro",
  "huevos": "uova",
  "huevo": "uovo",
  "aceite": "olio extravergine di oliva",
  "agua": "acqua",
  "cebolla": "cipolla",
  "ajo": "aglio",
  "miel": "miele",
  "nata (spagnolo)": "panna",
};

// Testa se una stringa sembra italiana (euristico semplice)
const ITALIAN_FOOD_WORDS = new Set([
  "sale", "zucchero", "farina", "burro", "uova", "uovo", "latte", "olio", "panna", "acqua",
  "pepe", "aglio", "cipolla", "pomodoro", "pomodori", "basilico", "origano", "rosmarino",
  "timo", "prezzemolo", "cannella", "vaniglia", "cioccolato", "mandorle", "noci", "nocciole",
  "pinoli", "uvetta", "lievito", "aceto", "vino", "brodo", "pollo", "manzo", "maiale",
  "pesce", "salmone", "tonno", "gamberi", "funghi", "zucchine", "melanzane", "peperoni",
  "carote", "patate", "spinaci", "riso", "pasta", "pane", "limone", "arancia", "mela",
  "miele", "formaggio", "parmigiano", "mozzarella", "ricotta", "pecorino", "prosciutto",
  "pancetta", "speck", "verdure", "erbe", "farro", "orzo", "quinoa", "ceci", "lenticchie",
  "fagioli", "piselli", "sedano", "finocchio", "radicchio", "rucola", "insalata", "cavolo",
  "broccoli", "cavolfiore", "asparagi", "carciofi", "zucca", "castagne", "pere", "fragole",
  "mirtilli", "lamponi", "albicocche", "pesche", "uva", "fichi", "melograno", "avocado",
  "sesamo", "curcuma", "zenzero", "paprika", "noce moscata", "alloro", "salvia", "mentaé",
  "menta", "aneto", "capperi", "olive", "acciughe", "tonno", "baccalà", "merluzzo",
  "orata", "branzino", "sogliola", "gamberi", "calamari", "polpo", "cozze", "vongole",
  "vitello", "agnello", "coniglio", "tacchino", "anatra", "salsiccia", "mortadella",
  "bresaola", "guanciale", "lardo", "strutto", "yogurt", "panna acida", "kefir",
  "pane", "grissini", "fette biscottate", "crackers", "semola", "amido", "maizena",
  "zucchero di canna", "miele di acacia", "sciroppo", "rum", "marsala", "grappa",
  "olio extravergine", "aceto balsamico", "aceto di vino", "senape", "worcestershire",
  "tabasco", "salsa di soia", "concentrato di pomodoro", "passata di pomodoro",
  "polpa di pomodoro", "pelati", "pomodorini", "ciliegini"
]);

function correctIngredientName(name) {
  if (!name || typeof name !== "string") return name;
  
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  // 1. Controlla corrispondenza esatta nel dizionario
  if (CORRECTIONS[lower]) return CORRECTIONS[lower];
  
  // 2. Controlla se contiene una parola sbagliata (corrispondenza parziale per parole singole)
  for (const [wrong, right] of Object.entries(CORRECTIONS)) {
    if (!wrong.includes(" ")) { // solo parole singole per evitare falsi positivi
      const regex = new RegExp(`^${wrong}$`, 'i');
      if (regex.test(trimmed)) return right;
    }
  }
  
  // 3. L'ingrediente sembra già ok
  return trimmed;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Carica tutte le ricette
    const recipes = await base44.asServiceRole.entities.Recipe.list("-created_date", 1000);

    const fixedList = [];
    let totalChecked = 0;

    for (const recipe of recipes) {
      if (!recipe.ingredients || recipe.ingredients.length === 0) continue;
      totalChecked++;

      let hasChange = false;
      const fixedIngredients = recipe.ingredients.map(ing => {
        if (!ing.name) return ing;
        const corrected = correctIngredientName(ing.name);
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
        const fixes = recipe.ingredients
          .filter(ing => correctIngredientName(ing.name) !== ing.name)
          .map(ing => `"${ing.name}" → "${correctIngredientName(ing.name)}"`);
        fixedList.push({ id: recipe.id, title: recipe.title, fixes });
      }
    }

    return Response.json({
      success: true,
      total_recipes: recipes.length,
      total_with_ingredients: totalChecked,
      total_fixed: fixedList.length,
      details: fixedList,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});