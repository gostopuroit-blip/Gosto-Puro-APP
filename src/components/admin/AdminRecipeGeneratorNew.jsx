import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Check, RotateCcw, Pencil } from "lucide-react";
import { toast } from "sonner";
import RecipeEditor from "./RecipeEditor";

const OCCASIONS_LIST = [
  "Colazione", "Pranzo", "Cena", "Leggera", "Dolci",
  "In famiglia", "Per due", "Con amici", "Feste",
  "Estate", "Autunno", "Inverno", "Primavera",
  "Veloci", "Instagram", "Natale e Capodanno", "Dal mondo",
  "275 Ricette Fitness Pratiche ed Economiche",
  "Senza zucchero", "Detox",
  "365 Ricette Deliziose per Diabetici",
  "Proteiche", "Low carb",
  "Friggitrice ad Aria",
  "Facili da Congelare",
  "Ricette Sane",
  "Collezione Gosto Puro",
];

const CATEGORIES = ["Colazione", "Pranzo", "Cena", "Dolce", "Snack", "Bevanda"];
const DIFFICULTIES = ["Facile", "Media", "Difficile"];
const DIETARY_TAGS = [
  "Senza glutine", "Senza lattosio", "Senza zucchero", "Vegano", "Vegetariano",
  "Low carb", "Alto contenuto proteico", "Diabetico", "Detox", "Fit", "Senza uova", "Senza frutti di mare"
];

// Pre-selezione automatica per occasione
const getDietaryPreselectionsForOccasion = (occasion) => {
  const lower = occasion?.toLowerCase() || "";
  const tags = [];
  if (lower.includes("diabete")) tags.push("Diabetico");
  if (lower.includes("fit")) tags.push("Fit");
  if (lower.includes("detox")) tags.push("Detox");
  if (lower.includes("low carb")) tags.push("Low carb");
  if (lower.includes("senza zucchero")) tags.push("Senza zucchero");
  if (lower.includes("proteiche")) tags.push("Alto contenuto proteico");
  return tags;
};

export default function AdminRecipeGeneratorNew() {
  // PARTE 1 — FORMULÁRIO DE GERAÇÃO
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Pranzo");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Facile");

  const [targetKcal, setTargetKcal] = useState("");
  const [generating, setGenerating] = useState(false);

  // PARTE 3 — ESTADO APÓS GERAR
  const [recipeState, setRecipeState] = useState(null); // { recipe, dietaryTags, lifestyle, isPremium }
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const recipe = recipeState?.recipe || null;
  const selectedDietaryTags = recipeState?.dietaryTags || [];
  const selectedLifestyle = recipeState?.lifestyle || [];
  const isPremium = recipeState?.isPremium ?? true;



  // Quando seleciona ocasião, auto-seleciona dietary tags
  // Estado separado para dietary tags do formulário (antes de gerar)
  const [formDietaryTags, setFormDietaryTags] = useState([]);

  const handleOccasionChange = (occasion) => {
    setSelectedOccasion(occasion);
    const preselected = getDietaryPreselectionsForOccasion(occasion);
    setFormDietaryTags(preselected);
  };

  // PARTE 2 — CONSTRUIR E ENVIAR PROMPT
  const buildMasterPrompt = () => {
    const dietaryTagsStr = formDietaryTags.length > 0
      ? formDietaryTags.join(", ")
      : "automatico";

    const occasionStr = selectedOccasion || "generica";
    const categoryStr = selectedCategory || "generica";
    const difficultyStr = selectedDifficulty || "Facile";
    const kcalStr = targetKcal ? `${targetKcal}` : "libero";

    return `Genera una ricetta italiana originale. Rispondi SOLO con JSON puro, senza markdown, senza testo fuori dal JSON.

{
  "title": "Nome della Ricetta in Italiano",
  "description": "Descrizione breve e appetitosa (max 2 righe)",
  "category": "${categoryStr}",
  "occasions": ["${occasionStr}"],
  "lifestyle": [analizza e aggiungi automaticamente tutte le tag applicabili],
  "dietary_tags": [analizza ingredienti e aggiungi TUTTE le tag applicabili senza limite],
  "difficulty": "${difficultyStr}",
  "prep_time": [tempo TOTALE realistico in minuti],
  "servings": [porzioni intere],
  "calorie": [kcal per porzione],
  "proteine": [g],
  "carboidrati": [g],
  "grassi": [g],
  "fibre": [g],
  "zuccheri": [g],
  "sodio": [mg],
  "numero_salvate": 0,
  "numero_preparate": 0,
  "total_rating": 0,
  "rating_count": 0,
  "media_rating": 0,
  "is_premium": true,
  "status": "bozza",
  "ingredients": [{"name": "...", "quantity": "...", "category": "Ortofrutta|Carne e pesce|Latticini|Dispensa|Surgelati|Altro"}],
  "instructions": ["Passo 1...", "Passo 2...", "... minimo 8 passi"],
  "sostituzioni": [{"ingrediente_nome": "...", "opzioni": [{"nome": "...", "quantita": "...", "tags": [], "impatto_calorie": 0, "impatto_proteine": 0, "impatto_carboidrati": 0, "impatto_grassi": 0}]}]
}

REGOLE DIETARY_TAGS — aggiungi automaticamente TUTTE le applicabili:
- "Senza glutine" → niente frumento, orzo, segale, avena
- "Senza lattosio" → niente latte, formaggio, burro, panna, yogurt
- "Senza zucchero" → niente zucchero, miele, sciroppi
- "Vegano" → niente prodotti animali
- "Vegetariano" → niente carne né pesce
- "Low carb" → carboidrati < 20g per porzione
- "Alto contenuto proteico" → proteine > 20g per porzione
- "Diabetico" → zuccheri < 10g e carboidrati < 30g per porzione
- "Detox" → solo verdure, frutta, erbe, niente processati
- "Fit" → calorie < 400 e macro equilibrati
- "Senza uova" → niente uova
- "Senza frutti di mare" → niente frutti di mare

REGOLE LIFESTYLE — aggiungi automaticamente tutte le applicabili:
- "Vegano" → se non contiene prodotti animali (carne, pesce, uova, latticini, miele)
- "Vegetariano" → se non contiene carne né pesce
- "Fit" → calorie < 400 e macro equilibrati (proteine >= carboidrati)
- "Alto contenuto proteico" → proteine > 20g per porzione
- "Low carb" → carboidrati < 20g per porzione
- "Detox" → basata su verdure, frutta, erbe, legumi, niente processati né zuccheri

NOTA: lifestyle e dietary_tags possono avere valori simili ma servono scopi diversi — compilare entrambi indipendentemente.

${selectedOccasion?.toLowerCase().includes("friggitrice") ? `[SE OCCASIONE = "Friggitrice ad Aria"]:
Nelle instructions includere OBBLIGATORIAMENTE:
- Preriscaldare la friggitrice ad aria (temperatura °C e minuti)
- Come posizionare il cibo nel cestello
- Tempo cottura in air fryer (°C, minuti, eventuale girata)
- Tempo di riposo se necessario` : ""}

${selectedOccasion?.toLowerCase().includes("congelare") ? `[SE OCCASIONE = "Facili da Congelare"]:
Aggiungere OBBLIGATORIAMENTE alla fine delle instructions:
- "CONGELAMENTO: [miglior modo di congelare]"
- "IMBALLAGGIO: [come avvolgere/sigillare]"
- "DURATA: [giorni/mesi in freezer]"
- "SCONGELAMENTO: [come scongelare]"` : ""}

OCCASIONE: ${occasionStr}
CATEGORY: ${categoryStr}
DIFFICOLTÀ: ${difficultyStr}
DIETARY TAGS RICHIESTE: ${dietaryTagsStr}
KCAL TARGET: ${kcalStr}`;
  };

  const handleGenerate = async () => {
    if (!selectedOccasion) {
      toast.error("Seleziona un'occasione");
      return;
    }

    setGenerating(true);
    const prompt = buildMasterPrompt();
    setGeneratedPrompt(prompt);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            occasions: { type: "array", items: { type: "string" } },
            lifestyle: { type: "array", items: { type: "string" }, description: "Lifestyle tags: Vegano, Vegetariano, Fit, Alto contenuto proteico, Low carb, Detox" },
            dietary_tags: { type: "array", items: { type: "string" }, description: "Dietary tags: Senza glutine, Senza lattosio, Senza zucchero, Vegano, Vegetariano, Low carb, Alto contenuto proteico, Diabetico, Detox, Fit, Senza uova, Senza frutti di mare" },
            difficulty: { type: "string" },
            prep_time: { type: "number" },
            servings: { type: "number" },
            calorie: { type: "number" },
            proteine: { type: "number" },
            carboidrati: { type: "number" },
            grassi: { type: "number" },
            fibre: { type: "number" },
            zuccheri: { type: "number" },
            sodio: { type: "number" },
            numero_salvate: { type: "number" },
            numero_preparate: { type: "number" },
            total_rating: { type: "number" },
            rating_count: { type: "number" },
            media_rating: { type: "number" },
            status: { type: "string" },
            ingredients: { type: "array", items: { type: "object" } },
            instructions: { type: "array", items: { type: "string" } },
            sostituzioni: { type: "array", items: { type: "object" } },
          },
        },
      });

      const LIFESTYLE_LIST = ["Vegano", "Vegetariano", "Fit", "Alto contenuto proteico", "Low carb", "Detox"];

      // Deriva i tag direttamente dai macros e dagli ingredienti calcolati dall'IA
      const calorie = result.calorie || 0;
      const proteine = result.proteine || 0;
      const carboidrati = result.carboidrati || 0;
      const grassi = result.grassi || 0;
      const zuccheri = result.zuccheri || 0;
      const ingredientNames = (result.ingredients || []).map(i => (i.name || "").toLowerCase()).join(" ");

      const hasAnimalProducts = /carne\b|pollo|manzo|maiale|salmone|tonno|pesce\b|prosciutto|pancetta|uov|burro|latte\b|formaggio|panna|yogurt|miele|gamberi|frutti di mare|acciughe|ricotta|mozzarella|parmigiano|pecorino|grana/.test(ingredientNames);
      const hasMeat = /carne\b|pollo|manzo|maiale|salmone|tonno|pesce\b|prosciutto|pancetta|gamberi|frutti di mare|acciughe/.test(ingredientNames);
      const hasGluten = /farina\s*0+\b|farina di grano|farina di frumento|farina integrale|pasta\b|pane\b|orzo\b|segale|farro|semola/.test(ingredientNames);
      const hasLactose = /latte\b|formaggio|panna|burro|yogurt|ricotta|mozzarella|parmigiano|pecorino|grana/.test(ingredientNames);
      const hasEggs = /uov/.test(ingredientNames);
      const hasSeafood = /gamberi|frutti di mare|acciughe|vongole|cozze|calamari|polpo/.test(ingredientNames);
      const hasSugar = /zucchero|miele|sciroppo/.test(ingredientNames);

      const derivedDietaryTags = [];
      if (!hasGluten) derivedDietaryTags.push("Senza glutine");
      if (!hasLactose) derivedDietaryTags.push("Senza lattosio");
      if (!hasSugar && zuccheri < 5) derivedDietaryTags.push("Senza zucchero");
      if (!hasAnimalProducts) derivedDietaryTags.push("Vegano");
      if (!hasMeat) derivedDietaryTags.push("Vegetariano");
      if (carboidrati < 20) derivedDietaryTags.push("Low carb");
      if (proteine > 20) derivedDietaryTags.push("Alto contenuto proteico");
      if (zuccheri < 10 && carboidrati < 30) derivedDietaryTags.push("Diabetico");
      if (!hasEggs) derivedDietaryTags.push("Senza uova");
      if (!hasSeafood) derivedDietaryTags.push("Senza frutti di mare");

      const derivedLifestyle = [];
      if (!hasAnimalProducts) derivedLifestyle.push("Vegano");
      if (!hasMeat) derivedLifestyle.push("Vegetariano");
      if (calorie < 400 && proteine >= carboidrati) derivedLifestyle.push("Fit");
      if (proteine > 20) derivedLifestyle.push("Alto contenuto proteico");
      if (carboidrati < 20) derivedLifestyle.push("Low carb");

      // Aggiungi anche i tag forzati dall'occasione selezionata
      const occasionForcedDietary = formDietaryTags.filter(t => !derivedDietaryTags.includes(t));
      const finalDietaryTags = [...derivedDietaryTags, ...occasionForcedDietary];

      console.log("[Generator] macros:", { calorie, proteine, carboidrati, zuccheri });
      console.log("[Generator] derivedDietaryTags:", derivedDietaryTags);
      console.log("[Generator] derivedLifestyle:", derivedLifestyle);

      setRecipeState({
        recipe: result,
        dietaryTags: finalDietaryTags,
        lifestyle: derivedLifestyle,
        isPremium: true,
      });
      toast.success("Ricetta generata!");
    } catch (error) {
      toast.error("Errore nella generazione: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!recipe) return;
    setSaving(true);

    try {
      // Costruzione esplicita del payload completo
      const data = {
        title: recipe.title || "",
        description: recipe.description || "",
        category: recipe.category || selectedCategory,
        occasions: recipe.occasions || [],
        lifestyle: selectedLifestyle,
        dietary_tags: selectedDietaryTags,
        difficulty: recipe.difficulty || selectedDifficulty,
        prep_time: recipe.prep_time || 30,
        servings: recipe.servings || 4,
        calorie: recipe.calorie || 0,
        proteine: recipe.proteine || 0,
        carboidrati: recipe.carboidrati || 0,
        grassi: recipe.grassi || 0,
        fibre: recipe.fibre || 0,
        zuccheri: recipe.zuccheri || 0,
        sodio: recipe.sodio || 0,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        sostituzioni: recipe.sostituzioni || [],
        numero_salvate: 0,
        numero_preparate: 0,
        total_rating: 0,
        rating_count: 0,
        media_rating: 0,
        status: "pubblicata",
        is_premium: isPremium === true,
        gen_prompt: generatedPrompt,
      };
      await base44.entities.Recipe.create(data);
      toast.success("Ricetta pubblicata!");
      setRecipeState(null);
      setGeneratedPrompt("");
      setSelectedOccasion(null);
      setSelectedCategory("Pranzo");
      setSelectedDifficulty("Facile");
      setTargetKcal("");
    } catch (error) {
      toast.error("Errore: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    handleGenerate();
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {!recipe ? (
        // PARTE 1 — FORMULÁRIO
        <div className="space-y-4">
          {/* Occasione */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-3">Occasione</p>
            <select
              value={selectedOccasion || ""}
              onChange={(e) => handleOccasionChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-white text-sm focus:outline-none"
            >
              <option value="">— Seleziona un'occasione —</option>
              {OCCASIONS_LIST.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-3">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedCategory === cat
                      ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                      : "bg-gray-50 text-gray-600 border-gray-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-3">Difficoltà</p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedDifficulty === diff
                      ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                      : "bg-gray-50 text-gray-600 border-gray-100"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Tags */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-3">Dietary Tags</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setFormDietaryTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    formDietaryTags.includes(tag)
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-50 text-gray-600 border-gray-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Target Kcal */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-2">Target Kcal (opzionale)</p>
            <input
              type="number"
              value={targetKcal}
              onChange={(e) => setTargetKcal(e.target.value)}
              placeholder="Es: 350"
              className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50 focus:outline-none"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedOccasion || generating}
            className="w-full flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-3 rounded-2xl font-bold text-sm disabled:opacity-50 transition-all"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? "Generando..." : "Genera Ricetta 🪄"}
          </button>
        </div>
      ) : !editing ? (
        // PARTE 3 — PREENCHIMENTO AUTOMÁTICO E AÇÕES
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{recipe.title}</p>
            <p className="text-xs text-gray-500 mt-1">{recipe.description}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-medium">
                {recipe.category}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
                {recipe.difficulty}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
                ⏱️ {recipe.prep_time} min
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
                🍽️ {recipe.servings} porzioni
              </span>
            </div>
          </div>

          {/* TAG DIETETICI */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tag Dietetici</p>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setRecipeState((prev) => ({
                    ...prev,
                    dietaryTags: prev.dietaryTags.includes(tag)
                      ? prev.dietaryTags.filter((t) => t !== tag)
                      : [...prev.dietaryTags, tag]
                  }))}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    selectedDietaryTags.includes(tag)
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-50 text-gray-400 border-gray-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* STILE DI VITA */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Stile di Vita</p>
            <div className="flex flex-wrap gap-1.5">
              {["Vegano", "Vegetariano", "Fit", "Alto contenuto proteico", "Low carb", "Detox"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setRecipeState((prev) => ({
                    ...prev,
                    lifestyle: prev.lifestyle.includes(tag)
                      ? prev.lifestyle.filter((t) => t !== tag)
                      : [...prev.lifestyle, tag]
                  }))}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    selectedLifestyle.includes(tag)
                      ? "bg-teal-100 text-teal-700 border-teal-300"
                      : "bg-gray-50 text-gray-400 border-gray-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Visibilità Premium */}
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-700">Visibilità:</label>
            <button
              onClick={() => setRecipeState((prev) => ({ ...prev, isPremium: false }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                !isPremium
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              🌐 Tutti
            </button>
            <button
              onClick={() => setRecipeState((prev) => ({ ...prev, isPremium: true }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isPremium
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              ⭐ Premium
            </button>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <strong>Macros (per porzione):</strong> {recipe.calorie} kcal | {recipe.proteine}g prot | {recipe.carboidrati}g carb | {recipe.grassi}g fat
            </p>
            <p>
              <strong>Ingredienti:</strong> {recipe.ingredients?.length || 0} ingredienti
            </p>
            <p>
              <strong>Istruzioni:</strong> {recipe.instructions?.length || 0} passi
            </p>
          </div>

          {/* PARTE 4 — AZIONI */}
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              ✅ Pubblica
            </button>
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              🔄 Rigenera
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm"
            >
              <Pencil className="w-4 h-4" />
              ✏️ Modifica
            </button>
          </div>
        </div>
      ) : (
        // EDITOR MODE
        <RecipeEditor 
          recipe={recipe} 
          onSave={(updated) => {
            setRecipeState((prev) => ({ ...prev, recipe: updated }));
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}