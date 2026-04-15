import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Sparkles, Check, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const DIETARY_TAGS_OPTIONS = [
  "Senza glutine", "Senza lattosio", "Senza zucchero", "Vegano", "Vegetariano",
  "Low carb", "Alto contenuto proteico", "Diabetico", "Detox", "Fit",
  "Senza uova", "Senza frutti di mare"
];

const BATCH_SIZE = 10;

const ANALYSIS_PROMPT = (recipe) => `Analizza questa ricetta italiana e determina quali dietary_tags si applicano.

Ricetta: "${recipe.title}"
Ingredienti: ${(recipe.ingredients || []).map(i => i.name).join(", ")}
Macros per porzione: calorie=${recipe.calorie || recipe.calories || "?"}, proteine=${recipe.proteine || "?"}g, carboidrati=${recipe.carboidrati || "?"}g, grassi=${recipe.grassi || "?"}g, zuccheri=${recipe.zuccheri || "?"}g

Regole:
- "Senza glutine" → nessun frumento, segale, orzo, avena, farina normale, pasta normale, pane normale
- "Senza lattosio" → nessun latte, formaggio, burro, panna, yogurt, mozzarella, ricotta, mascarpone, parmigiano
- "Senza zucchero" → nessun zucchero, miele, sciroppo dolcificante in quantità significativa
- "Vegano" → nessun prodotto animale: carne, pesce, uova, latticini, miele
- "Vegetariano" → niente carne né pesce
- "Low carb" → carboidrati < 20g per porzione (se carboidrati non specificati, stima dagli ingredienti)
- "Alto contenuto proteico" → proteine > 20g per porzione
- "Diabetico" → zuccheri < 10g E carboidrati < 30g per porzione, no zucchero raffinato
- "Detox" → prevalentemente verdure fresche, frutta, erbe, senza ingredienti processati/industriali
- "Fit" → calorie < 400 per porzione E bilanciata nei macros
- "Senza uova" → nessun uovo
- "Senza frutti di mare" → nessun gambero, cozza, vongola, calamaro, polpo, frutti di mare, crostacei

Rispondi solo con JSON: {"tags": ["tag1", "tag2"]}`;

export default function AdminDietaryTagsBulk() {
  const [phase, setPhase] = useState("idle"); // idle | loading | review | saving
  const [recipes, setRecipes] = useState([]);
  const [results, setResults] = useState({}); // { recipeId: string[] }
  const [expanded, setExpanded] = useState({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [saved, setSaved] = useState(new Set());

  const loadAndAnalyze = async () => {
    setPhase("loading");
    setResults({});
    setSaved(new Set());

    // Fetch recipes without dietary_tags
    const allRecipes = await base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", 1000);
    const withoutTags = allRecipes.filter(r => !r.dietary_tags || r.dietary_tags.length === 0);

    if (withoutTags.length === 0) {
      toast.success("Tutte le ricette hanno già i dietary_tags!");
      setPhase("idle");
      return;
    }

    setRecipes(withoutTags);
    setProgress({ current: 0, total: withoutTags.length });

    const newResults = {};

    // Process in batches
    for (let i = 0; i < withoutTags.length; i += BATCH_SIZE) {
      const batch = withoutTags.slice(i, i + BATCH_SIZE);

      // Parallel within batch
      const batchResults = await Promise.all(
        batch.map(async (recipe) => {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: ANALYSIS_PROMPT(recipe),
            response_json_schema: {
              type: "object",
              properties: {
                tags: { type: "array", items: { type: "string" } }
              }
            }
          });
          return { id: recipe.id, tags: result?.tags || [] };
        })
      );

      batchResults.forEach(({ id, tags }) => {
        newResults[id] = tags.filter(t => DIETARY_TAGS_OPTIONS.includes(t));
      });

      setProgress({ current: Math.min(i + BATCH_SIZE, withoutTags.length), total: withoutTags.length });
      setResults({ ...newResults });
    }

    setPhase("review");
    toast.success(`Analisi completata! ${withoutTags.length} ricette pronte per la revisione.`);
  };

  const toggleTag = (recipeId, tag) => {
    setResults(prev => {
      const current = prev[recipeId] || [];
      return {
        ...prev,
        [recipeId]: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
      };
    });
  };

  const saveOne = async (recipe) => {
    await base44.entities.Recipe.update(recipe.id, { dietary_tags: results[recipe.id] || [] });
    setSaved(prev => new Set([...prev, recipe.id]));
    toast.success(`"${recipe.title}" salvata!`);
  };

  const saveAll = async () => {
    setPhase("saving");
    const toSave = recipes.filter(r => !saved.has(r.id));
    for (const recipe of toSave) {
      await base44.entities.Recipe.update(recipe.id, { dietary_tags: results[recipe.id] || [] });
    }
    setSaved(new Set(recipes.map(r => r.id)));
    setPhase("review");
    toast.success(`${toSave.length} ricette aggiornate!`);
  };

  const pendingCount = recipes.filter(r => !saved.has(r.id)).length;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
        <h3 className="text-sm font-bold text-green-800 mb-1">🏷️ Aggiorna Tag Dietetici in lotto</h3>
        <p className="text-xs text-green-600">
          Cerca ricette senza dietary_tags e usa l'AI per suggerire le tag corrette basandosi sugli ingredienti.
          Poi puoi rivedere e confermare prima di salvare.
        </p>
      </div>

      {phase === "idle" && (
        <Button onClick={loadAndAnalyze} className="w-full rounded-xl bg-[#2D6A4F] hover:bg-[#235c43] font-bold">
          <Sparkles className="w-4 h-4 mr-2" />
          Analizza ricette senza tag
        </Button>
      )}

      {phase === "loading" && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-700">
            Processando {progress.current} di {progress.total} ricette...
          </p>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-[#2D6A4F] h-2 rounded-full transition-all"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
          {Object.keys(results).length > 0 && (
            <p className="text-xs text-gray-400">{Object.keys(results).length} ricette analizzate finora...</p>
          )}
        </div>
      )}

      {(phase === "review" || phase === "saving") && recipes.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">
              {pendingCount} ricette da salvare · {saved.size} già salvate
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPhase("idle"); setRecipes([]); setResults({}); }}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500"
              >
                Ricomincia
              </button>
              <button
                onClick={saveAll}
                disabled={phase === "saving" || pendingCount === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold disabled:opacity-50"
              >
                {phase === "saving" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Applica tutto ({pendingCount})
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {recipes.map(recipe => {
              const tags = results[recipe.id] || [];
              const isSaved = saved.has(recipe.id);
              const isOpen = expanded[recipe.id];

              return (
                <div
                  key={recipe.id}
                  className={`bg-white rounded-2xl border overflow-hidden transition-all ${isSaved ? "border-green-200 bg-green-50/30" : "border-gray-100"}`}
                >
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [recipe.id]: !e[recipe.id] }))}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{recipe.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.length === 0 ? (
                          <span className="text-[10px] text-gray-400">Nessuna tag</span>
                        ) : tags.map(t => (
                          <span key={t} className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSaved && <Check className="w-4 h-4 text-green-500" />}
                      {!isSaved && (
                        <button
                          onClick={(e) => { e.stopPropagation(); saveOne(recipe); }}
                          className="text-[10px] font-bold text-[#2D6A4F] bg-[#2D6A4F]/10 px-2 py-1 rounded-lg"
                        >
                          Salva
                        </button>
                      )}
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-gray-50 pt-2">
                      <p className="text-[10px] text-gray-400 mb-2">Modifica le tag suggerite:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {DIETARY_TAGS_OPTIONS.map(tag => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(recipe.id, tag)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                              tags.includes(tag)
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-white border-gray-200 text-gray-500"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}