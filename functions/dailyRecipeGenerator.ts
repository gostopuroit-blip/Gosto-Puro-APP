import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// The 3 "giorno" occasions to rotate through daily
const GIORNO_LABELS = ["Colazione", "Pranzo", "Cena"];

const PRANZO_EXTRA = `
REGOLE SPECIFICHE PER PRANZO ITALIANO:
- La ricetta deve essere riconoscibile e tradizionale (es: pasta al pomodoro, lasagne, risotto, pollo al forno, parmigiana, brasato)
- NO combinazioni fusion, NO ingredienti esotici, NO reinterpretazioni moderne inutili
- Rispettare la stagionalità: inverno = piatti caldi, forno, zuppe; estate = pasta fredda, insalate, verdure grigliate
- Struttura equilibrata: Primo (carboidrato) + Secondo (proteina) + Contorno (verdura)
- L'italiano vuole sentire "Che buono" non "Che creativo"
- Ingredienti realistici e stagionali, facilmente reperibili in un supermercato italiano
- Porzione adeguata al pranzo italiano
- Presentazione semplice e autentica, piatto pieno ma ordinato
`;

const CENA_EXTRA = `
REGOLE SPECIFICHE PER CENA ITALIANA:
- La cena deve essere più leggera rispetto al pranzo: NO lasagne pesanti, NO fritti, NO piatti eccessivamente grassi
- Preferire: verdure, proteine leggere (pesce, uova, pollo), zuppe, minestre, frittate
- Preparazione semplice e veloce: idealmente 20–30 minuti, al massimo 40 minuti
- Porzione moderata: l'italiano non vuole appesantirsi la sera
- Piatto digeribile, ingredienti stagionali e facilmente reperibili
- Presentazione elegante ma naturale
`;

const COLAZIONE_EXTRA = `
REGOLE SPECIFICHE PER COLAZIONE ITALIANA:
- Ricetta tipica della colazione italiana: dolce, leggera, semplice
- Esempi: cornetto, torta semplice, pancakes al cioccolato, yogurt granola, frullato, cappuccino con biscotti
- Ingredienti semplici e reperibili in qualsiasi supermercato italiano
- Preparazione veloce: max 20 minuti
- Porzione moderata e bilanciata, ideale per iniziare la giornata con energia
- Profumo di caffè, latte e forno di prima mattina
`;

function getExtra(categoria) {
  if (categoria === "pranzo") return PRANZO_EXTRA;
  if (categoria === "cena") return CENA_EXTRA;
  return COLAZIONE_EXTRA;
}

function buildRecipePrompt(occ, existingTitles) {
  const guidelines = (occ.linee_guida || []).join("\n- ");
  const extra = getExtra(occ.categoria_principale || occ.label.toLowerCase());
  const titlesBlock = existingTitles.length > 0
    ? `\nRICETTE GIÀ ESISTENTI (NON RIPETERE MAI QUESTI TITOLI, NÉ VARIANTI SIMILI):\n${existingTitles.map(t => `- ${t}`).join("\n")}\n`
    : "";

  return `Sei uno chef esperto di cucina italiana.

Crea una ricetta autentica italiana per questa occasione.
${titlesBlock}
Occasione: ${occ.label}
Mood: ${occ.mood || ""}
Categoria principale: ${occ.categoria_principale || occ.label.toLowerCase()}
Stagione: all
Difficoltà: Facile
Tempo massimo: 35 minuti
Porzioni: 4

Linee guida:
- ${guidelines}

${extra}
${occ.prompt_extra ? `\n${occ.prompt_extra}` : ""}

La ricetta deve essere autentica, realistica e coerente con l'occasione italiana.
IMPORTANTE: La ricetta generata deve essere completamente diversa da tutte quelle nell'elenco sopra.

Rispondi SOLO in formato JSON con questa struttura:
{
  "title": "Nome ricetta",
  "description": "Una frase breve e invitante (max 20 parole)",
  "category": "Pranzo",
  "prep_time": 25,
  "servings": 4,
  "calories": 320,
  "difficulty": "Facile",
  "occasions": ["${occ.label}"],
  "ingredients": [
    { "name": "farina 00", "quantity": "200g", "category": "Dispensa" }
  ],
  "instructions": [
    "Primo passo...",
    "Secondo passo..."
  ]
}

Categorie valide per ingredienti: Ortofrutta, Carne e pesce, Latticini, Dispensa, Surgelati, Altro.
Categorie valide per la ricetta: Colazione, Pranzo, Cena, Dolce, Snack, Bevanda.
Difficoltà valide: Facile, Media, Difficile.`;
}

function buildImagePrompt(occ, recipe) {
  const title = recipe.title;
  const modifiers = (occ.image_modifiers || []).join(", ");
  const mainIngredients = (recipe.ingredients || []).slice(0, 4).map(i => i.name).join(", ");

  return `Food photography: ${title}. 
Authentic Italian dish for ${occ.label.toLowerCase()}.
Main ingredients visible: ${mainIngredients}.
Style: ${modifiers || "natural light, clean Italian kitchen aesthetic"}.
Shot from above or 45-degree angle, clean composition, no text, no hands, no artificial effects.
Colors: warm, natural, inviting Italian food photography.
High quality, magazine style, realistic, appetizing.`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Accept scheduled calls (no user) or admin user calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      // Called by scheduler (no user token) — allow via service role
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load all "giorno" occasions
    const occasions = await base44.asServiceRole.entities.RecipeOccasion.filter({
      tipo: "giorno",
      is_active: true,
    });

    const giornoOccasions = occasions.filter(o => GIORNO_LABELS.includes(o.label));

    if (giornoOccasions.length === 0) {
      return Response.json({ error: 'No giorno occasions found' }, { status: 404 });
    }

    // Load existing titles to avoid duplicates
    const existingRecipes = await base44.asServiceRole.entities.Recipe.list("-created_date", 500);
    const existingTitles = existingRecipes.map(r => r.title);

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (const occ of giornoOccasions) {
      // 1. Generate recipe
      const recipePrompt = buildRecipePrompt(occ, existingTitles);
      const recipeData = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: recipePrompt,
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
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "string" },
                  category: { type: "string" },
                },
              },
            },
            instructions: { type: "array", items: { type: "string" } },
          },
        },
      });

      // 2. Generate image
      const imgPrompt = buildImagePrompt(occ, recipeData);
      const imgResult = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: imgPrompt,
      });

      // 3. Save recipe
      const saved = await base44.asServiceRole.entities.Recipe.create({
        ...recipeData,
        image_url: imgResult?.url || "",
        status: "pubblicata",
        numero_salvate: 0,
        numero_preparate: 0,
      });

      existingTitles.push(recipeData.title);
      results.push({ occasion: occ.label, title: recipeData.title, id: saved.id });
    }

    // 4. Save DailyNotification record
    await base44.asServiceRole.entities.DailyNotification.create({
      date: today,
      recipe_ids: results.map(r => r.id),
      recipe_titles: results.map(r => r.title),
      occasions: results.map(r => r.occasion),
    });

    return Response.json({ success: true, generated: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});