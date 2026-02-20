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
          results[group.name].push({ title: recipeResult.title, image: imageUrl ? "✓" : "✗" });
          totalGenerated++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      totalGenerated, 
      details: results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildRecipePrompt(occ) {
  const guidelines = occ.linee_guida?.join("\n- ") || "";
  const label = occ.label?.toLowerCase() || "";

  return `Sei uno chef esperto di cucina italiana.

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