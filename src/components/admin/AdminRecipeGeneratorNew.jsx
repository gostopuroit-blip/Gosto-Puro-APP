import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const OCCASIONS_LIST = [
  "Colazione", "Pranzo", "Cena", "Leggera", "Dolci",
  "In famiglia", "Per due", "Con amici", "Feste",
  "Estate", "Autunno", "Inverno", "Primavera",
  "Veloci", "Instagram", "Natale", "Capodanno", "Dal mondo",
  "275 Ricette Fitness Pratiche ed Economiche",
  "Senza zucchero", "Detox",
  "365 Ricette Deliziose per Diabetici",
  "Proteiche", "Low carb",
  "Friggitrice ad Aria",
  "Facili da Congelare",
  "Ricette Sane"
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
  const [selectedDietaryTags, setSelectedDietaryTags] = useState([]);
  const [targetKcal, setTargetKcal] = useState("");
  const [generating, setGenerating] = useState(false);

  // PARTE 3 — ESTADO APÓS GERAR
  const [recipe, setRecipe] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // AUTO-GERAR com parâmetros exatos na montagem
  useEffect(() => {
    autoGenerateOnMount();
  }, []);

  const autoGenerateOnMount = () => {
    setSelectedOccasion("Ricette Sane");
    setSelectedCategory("Pranzo");
    setSelectedDifficulty("Facile");
    setSelectedDietaryTags([]);
    setTargetKcal("");
    
    setTimeout(() => {
      setGenerating(true);
      const prompt = buildMasterPromptWithParams("Ricette Sane", "Pranzo", "Facile", [], "");
      setGeneratedPrompt(prompt);
      
      base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            occasions: { type: "array", items: { type: "string" } },
            lifestyle: { type: "array", items: { type: "string" } },
            dietary_tags: { type: "array", items: { type: "string" } },
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
      }).then((result) => {
        setRecipe(result);
        setGenerating(false);
        toast.success("Ricetta generata!");
      }).catch((error) => {
        setGenerating(false);
        toast.error("Errore: " + error.message);
      });
    }, 300);
  };

  // Quando seleciona ocasião, auto-seleciona dietary tags
  const handleOccasionChange = (occasion) => {
    setSelectedOccasion(occasion);
    const preselected = getDietaryPreselectionsForOccasion(occasion);
    setSelectedDietaryTags(preselected);
  };

  // PARTE 2 — CONSTRUIR E ENVIAR PROMPT
  const buildMasterPromptWithParams = (occ, cat, diff, tags, kcal) => {
    const dietaryTagsStr = tags.length > 0 ? tags.join(", ") : "automatico";
    const occasionStr = occ || "generica";
    const categoryStr = cat || "generica";
    const difficultyStr = diff || "Facile";
    const kcalStr = kcal ? `${kcal}` : "libero";
    return buildPromptContent(occasionStr, categoryStr, difficultyStr, dietaryTagsStr, kcalStr);
  };

  const buildMasterPrompt = () => {
    const dietaryTagsStr = selectedDietaryTags.length > 0
      ? selectedDietaryTags.join(", ")
      : "automatico";

    const occasionStr = selectedOccasion || "generica";
    const categoryStr = selectedCategory || "generica";
    const difficultyStr = selectedDifficulty || "Facile";
    const kcalStr = targetKcal ? `${targetKcal}` : "libero";
    return buildPromptContent(occasionStr, categoryStr, difficultyStr, dietaryTagsStr, kcalStr);
  };

  const buildPromptContent = (occasionStr, categoryStr, difficultyStr, dietaryTagsStr, kcalStr) => {

    return `Genera una ricetta italiana originale. Rispondi SOLO con JSON puro, senza markdown, senza testo fuori dal JSON.

{
  "title": "Nome della Ricetta in Italiano",
  "description": "Descrizione breve e appetitosa (max 2 righe)",
  "category": "${categoryStr}",
  "occasions": ["${occasionStr}"],
  "lifestyle": [],
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
            lifestyle: { type: "array", items: { type: "string" } },
            dietary_tags: { type: "array", items: { type: "string" } },
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

      setRecipe(result);
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
      const data = {
        ...recipe,
        gen_prompt: generatedPrompt,
      };
      await base44.entities.Recipe.create(data);
      toast.success("Ricetta pubblicata!");
      setRecipe(null);
      setGeneratedPrompt("");
      setSelectedOccasion(null);
      setSelectedCategory("Pranzo");
      setSelectedDifficulty("Facile");
      setSelectedDietaryTags([]);
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
                    setSelectedDietaryTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedDietaryTags.includes(tag)
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
      ) : editMode ? (
        // MODO MODIFICA — EDITOR COMPLETO
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">✏️ Modifica Ricetta</p>
            <button
              onClick={() => setEditMode(false)}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              ← Indietro
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Titolo</label>
              <input
                type="text"
                value={recipe.title}
                onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Descrizione</label>
              <textarea
                value={recipe.description}
                onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50 resize-none h-16"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Categoria</label>
                <select
                  value={recipe.category}
                  onChange={(e) => setRecipe({ ...recipe, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Difficoltà</label>
                <select
                  value={recipe.difficulty}
                  onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50"
                >
                  {DIFFICULTIES.map((diff) => (
                    <option key={diff}>{diff}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Tempo (min)</label>
                <input
                  type="number"
                  value={recipe.prep_time}
                  onChange={(e) => setRecipe({ ...recipe, prep_time: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Porzioni</label>
                <input
                  type="number"
                  value={recipe.servings}
                  onChange={(e) => setRecipe({ ...recipe, servings: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Calorie</label>
                <input
                  type="number"
                  value={recipe.calorie}
                  onChange={(e) => setRecipe({ ...recipe, calorie: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-2">Dietary Tags</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const tags = recipe.dietary_tags || [];
                      setRecipe({
                        ...recipe,
                        dietary_tags: tags.includes(tag)
                          ? tags.filter((t) => t !== tag)
                          : [...tags, tag],
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      (recipe.dietary_tags || []).includes(tag)
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-gray-50 text-gray-600 border-gray-100"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-2">Macros (per porzione)</label>
              <div className="grid grid-cols-4 gap-2">
                {["proteine", "carboidrati", "grassi", "fibre"].map((key) => (
                  <div key={key}>
                    <label className="text-[10px] text-gray-400 block mb-1 capitalize">{key}</label>
                    <input
                      type="number"
                      value={recipe[key]}
                      onChange={(e) => setRecipe({ ...recipe, [key]: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded-lg border border-gray-100 text-xs bg-gray-50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-2">Ingredienti</label>
              <div className="space-y-2">
                {(recipe.ingredients || []).map((ing, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => {
                        const ings = [...(recipe.ingredients || [])];
                        ings[idx] = { ...ings[idx], name: e.target.value };
                        setRecipe({ ...recipe, ingredients: ings });
                      }}
                      placeholder="Nome"
                      className="flex-1 px-2 py-1 rounded-lg border border-gray-100 text-xs bg-gray-50"
                    />
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={(e) => {
                        const ings = [...(recipe.ingredients || [])];
                        ings[idx] = { ...ings[idx], quantity: e.target.value };
                        setRecipe({ ...recipe, ingredients: ings });
                      }}
                      placeholder="Qtà"
                      className="w-20 px-2 py-1 rounded-lg border border-gray-100 text-xs bg-gray-50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-2">Istruzioni</label>
              <div className="space-y-2">
                {(recipe.instructions || []).map((step, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-xs font-bold text-gray-400 w-6 flex-shrink-0 text-center mt-2">{idx + 1}</span>
                    <textarea
                      value={step}
                      onChange={(e) => {
                        const steps = [...(recipe.instructions || [])];
                        steps[idx] = e.target.value;
                        setRecipe({ ...recipe, instructions: steps });
                      }}
                      className="flex-1 px-2 py-1 rounded-lg border border-gray-100 text-xs bg-gray-50 resize-none h-12"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AZIONI */}
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              ✅ Pubblica
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm"
            >
              ← Indietro
            </button>
          </div>
        </div>
      ) : (
        // PARTE 3 — PREVIEW (PRIMA DI MODIFICARE)
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

          {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.dietary_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

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
              onClick={() => setEditMode(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white py-2.5 rounded-xl font-semibold text-sm"
            >
              ✏️ Modifica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}