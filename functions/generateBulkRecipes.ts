import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all active occasions
    const occasions = await base44.asServiceRole.entities.RecipeOccasion.filter({ is_active: true }, "sort_order", 100);
    
    // Filter only daily occasions: Colazione, Pranzo, Cena
    const dailyOccasions = occasions.filter(o => 
      o.categoria_principale === "colazione" || 
      o.categoria_principale === "pranzo" || 
      o.categoria_principale === "cena"
    ).slice(0, 3);

    let totalGenerated = 0;
    const results = {};
    for (const occ of dailyOccasions) {
        const prompt = buildRecipePrompt(occ);
        
        const recipeResult = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              prep_time: { type: "number" },
              servings: { type: "number" },
              calories: { type: "number" },
              difficulty: { type: "string" },
              occasions: { type: "array", items: { type: "string" } },
              ingredients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "string" }, category: { type: "string" } } } },
              instructions: { type: "array", items: { type: "string" } },
            },
          },
        });

      if (recipeResult && recipeResult.title) {
        // Generate image
        let imageUrl = "";
        const imagePrompt = buildImagePrompt(occ, recipeResult);
        const imgResult = await base44.integrations.Core.GenerateImage({ prompt: imagePrompt });
        if (imgResult?.url) imageUrl = imgResult.url;

        // Save recipe
        const recipeData = {
          ...recipeResult,
          image_url: imageUrl || "",
          status: "pubblicata",
          gen_prompt: prompt,
          numero_salvate: 0,
          numero_preparate: 0,
        };

        await base44.asServiceRole.entities.Recipe.create(recipeData);
        totalGenerated++;
      }
    }

    return Response.json({ 
      success: true, 
      totalGenerated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildRecipePrompt(occ) {
  const guidelines = occ.linee_guida?.join("\n- ") || "";
  const label = occ.label?.toLowerCase() || "";

  return `Sei uno chef esperto di cucina italiana. Scrivi come un italiano, non come un traduttore automatico.

Crea una ricetta autentica italiana per questa occasione:

Occasione: ${occ.label}
Mood: ${occ.mood || ""}
Categoria: ${occ.categoria_principale || "all"}
Stagione: ${occ.stagione || "all"}
Difficoltà: ${Math.random() > 0.5 ? "Facile" : "Media"}
Tempo massimo: ${Math.floor(Math.random() * 45) + 15} minuti
Porzioni: 4

Linee guida:
- ${guidelines}

La ricetta deve essere autentica, realistica e coerente con l'occasione.

═══════════════════════════════════════
REGOLE ASSOLUTE SUGLI INGREDIENTI — NON DEROGABILI
═══════════════════════════════════════
1. Tutti i nomi degli ingredienti DEVONO essere in italiano corretto e reale.
2. MAI usare parole in inglese, spagnolo, portoghese o altre lingue.
3. MAI usare parole non alimentari (es: "vendita", "asino", "oggetti", ecc.)
4. DIZIONARIO OBBLIGATORIO — usa SEMPRE questi nomi esatti:
   - sale (MAI: vendita, sell, salt, salita, venta)
   - zucchero (MAI: asino, sugar, açúcar, azúcar)
   - zucchero di canna (MAI: brown sugar)
   - farina 00 o farina integrale (MAI: flour)
   - burro (MAI: butter)
   - uova / uovo (MAI: eggs/egg)
   - latte (MAI: milk)
   - olio extravergine di oliva (MAI: oil, olive oil)
   - panna (MAI: cream)
   - acqua (MAI: water)
   - pepe (MAI: pepper)
   - aglio (MAI: garlic)
   - cipolla (MAI: onion)
   - pomodori / pomodoro (MAI: tomato/tomatoes)
   - basilico, rosmarino, timo, origano, prezzemolo (erbe aromatiche)
   - parmigiano reggiano, mozzarella, ricotta, pecorino (formaggi)
   - prosciutto crudo, prosciutto cotto, pancetta, speck (salumi)
   - noci, mandorle, nocciole, pistacchi (frutta secca)
   - miele, marmellata, confettura (dolcificanti naturali)
5. Prima di inserire un ingrediente, verificare: "È un alimento reale? Il nome è in italiano?"
   Se no → correggerlo immediatamente.
═══════════════════════════════════════

═══════════════════════════════════════
CALCOLO CALORIE OBBLIGATORIO — NON DEROGABILE
═══════════════════════════════════════
1. Calcola le calorie di OGNI ingrediente usando valori medi reali:
   - Uova: 70 kcal per uovo
   - Olio extravergine di oliva: 9 kcal per grammo (≈ 90 kcal per 10 ml)
   - Burro: 720 kcal per 100g
   - Farina 00: 360 kcal per 100g
   - Zucchero: 400 kcal per 100g
   - Latte intero: 64 kcal per 100ml
   - Panna: 300 kcal per 100ml
   - Prosciutto crudo: 250 kcal per 100g
   - Formaggi stagionati (parmigiano, pecorino): 380 kcal per 100g
   - Mozzarella: 250 kcal per 100g
   - Pane / pasta / riso cotti: 130–160 kcal per 100g
   - Pasta / riso crudi: 350 kcal per 100g
   - Carne (pollo, manzo): 150–200 kcal per 100g
   - Pesce: 100–180 kcal per 100g
   - Verdure: 20–50 kcal per 100g
2. Somma tutte le calorie di tutti gli ingredienti.
3. Dividi per il numero di porzioni.
4. NON stimare. NON arrotondare per difetto. NON ignorare olio, burro o formaggi.
5. Se il valore calcolato appare troppo basso (es: meno di 250 kcal per un piatto principale), RICALCOLARE.
6. È vietato generare calorie basate su stime generiche o approssimative.
═══════════════════════════════════════

Rispondi SOLO in formato JSON:
{
  "title": "Nome ricetta",
  "description": "Una frase breve (max 20 parole)",
  "category": "Pranzo",
  "prep_time": 25,
  "servings": 4,
  "calories": 320,
  "difficulty": "Facile",
  "occasions": ["${occ.label}"],
  "ingredients": [
    { "name": "ingrediente", "quantity": "quantità", "category": "Dispensa" }
  ],
  "instructions": [
    "Passo 1...",
    "Passo 2..."
  ]
}`;
}

function buildImagePrompt(occ, recipe) {
  const mainIngredients = recipe.ingredients?.slice(0, 3).map(i => i.name).join(", ") || "";
  const label = occ.label?.toLowerCase() || "";

  return `Professional realistic food photography of ${recipe.title}, Italian ${occ.categoria_principale || "food"}, featuring ${mainIngredients}, warm natural Italian colors, no steam, no hands, no over styling, clean simple composition, high resolution.`;
}