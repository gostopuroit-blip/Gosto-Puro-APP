import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Image, Save, Loader2, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";

const difficulties = ["Facile", "Media", "Difficile"];
const categories = ["Colazione", "Pranzo", "Cena", "Dolce", "Snack", "Bevanda"];

export default function AdminRecipeGenerator() {
  const [occasions, setOccasions] = useState([]);
  const [loadingOcc, setLoadingOcc] = useState(true);
  const [selectedOcc, setSelectedOcc] = useState(null);

  // params
  const [difficulty, setDifficulty] = useState("Facile");
  const [maxTime, setMaxTime] = useState(30);
  const [servings, setServings] = useState(4);
  const [extraNote, setExtraNote] = useState("");

  // generated
  const [recipe, setRecipe] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.RecipeOccasion.filter({ is_active: true }, "sort_order", 50)
      .then(setOccasions).finally(() => setLoadingOcc(false));
  }, []);

  const grouped = {
    giorno: occasions.filter(o => o.tipo === "giorno"),
    speciale: occasions.filter(o => o.tipo === "speciale"),
    stile_vita: occasions.filter(o => o.tipo === "stile_vita"),
  };

  const buildRecipePrompt = (occ) => {
    const guidelines = occ.linee_guida?.join("\n- ") || "";
    const isPranzo = occ.categoria_principale === "pranzo" || occ.label?.toLowerCase().includes("pranzo");
    const isCena = occ.categoria_principale === "cena" || occ.label?.toLowerCase().includes("cena");

    const pranzoExtra = isPranzo ? `
REGOLE SPECIFICHE PER PRANZO ITALIANO:
- La ricetta deve essere riconoscibile e tradizionale (es: pasta al pomodoro, lasagne, risotto, pollo al forno, parmigiana, brasato)
- NO combinazioni fusion, NO ingredienti esotici, NO reinterpretazioni moderne inutili
- Rispettare la stagionalità: inverno = piatti caldi, forno, zuppe; estate = pasta fredda, insalate, verdure grigliate
- Struttura equilibrata: Primo (carboidrato) + Secondo (proteina) + Contorno (verdura)
- L'italiano vuole sentire "Che buono" non "Che creativo"
- Ingredienti realistici e stagionali, facilmente reperibili in un supermercato italiano
- Porzione adeguata al pranzo italiano (non microscopica)
- Presentazione semplice e autentica, piatto pieno ma ordinato
` : "";

    const cenaExtra = isCena ? `
REGOLE SPECIFICHE PER CENA ITALIANA:
- La cena deve essere più leggera rispetto al pranzo: NO lasagne pesanti, NO fritti, NO piatti eccessivamente grassi
- Preferire: verdure, proteine leggere (pesce, uova, pollo), zuppe, minestre, frittate
- Preparazione semplice e veloce: idealmente 20–30 minuti, al massimo ${maxTime} minuti
- Porzione moderata: l'italiano non vuole appesantirsi la sera
- Piatto digeribile: cultura italiana di "non appesantirsi la sera" è fondamentale
- Ingredienti stagionali e facilmente reperibili in un supermercato italiano
- Presentazione elegante ma naturale, non esagerata
- Atmosfera: rilassante, serale, intima
- Esempi validi: frittata con verdure, pesce al forno, insalata con tonno, minestrone, zuppa leggera, pollo al limone
` : "";

    return `Sei un cuoco italiano esperto.

Crea una ricetta autentica italiana per questa occasione.

Occasione: ${occ.label}
Mood: ${occ.mood || ""}
Categoria principale: ${occ.categoria_principale || "all"}
Stagione: ${occ.stagione || "all"}
Difficoltà: ${difficulty}
Tempo massimo: ${maxTime} minuti
Porzioni: ${servings}

Linee guida:
- ${guidelines}
${pranzoExtra}${cenaExtra}${extraNote ? `\nNote aggiuntive: ${extraNote}` : ""}

Usa ingredienti tipici italiani facilmente reperibili.
La ricetta deve essere autentica, realistica e coerente con l'occasione.

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
  };

  const buildImagePrompt = (occ, title) => {
    const isPranzo = occ.categoria_principale === "pranzo" || occ.label?.toLowerCase().includes("pranzo");
    const pranzoVisual = isPranzo
      ? `rustic wooden table, white ceramic plate, natural daylight from window, simple napkin beside plate, authentic Italian home lunch setting, warm natural colors, slightly blurred background, realistic and inviting,`
      : ``;
    const base = `Professional realistic food photography of ${title}, Italian ${occ.categoria_principale || "cuisine"},`;
    const modifiers = occ.image_modifiers?.join(", ") || "";
    const fixed = `no steam, no floating ingredients, no dramatic splash, no human presence, no hands, no over styling, no unrealistic effects, clean simple composition, warm neutral colors, high resolution`;
    return `${base} ${pranzoVisual} ${modifiers}, ${fixed}.`;
  };

  const handleGenerate = async () => {
    if (!selectedOcc) return toast.error("Seleziona un'occasione prima");
    setGenerating(true);
    setRecipe(null);
    setImageUrl("");
    const prompt = buildRecipePrompt(selectedOcc);
    const result = await base44.integrations.Core.InvokeLLM({
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
    setRecipe(result);
    setGenerating(false);
    toast.success("Ricetta generata! Controlla e poi genera l'immagine.");
  };

  const handleGenerateImage = async () => {
    if (!recipe) return;
    setGeneratingImage(true);
    const imgPrompt = buildImagePrompt(selectedOcc, recipe.title);
    const result = await base44.integrations.Core.GenerateImage({ prompt: imgPrompt });
    setImageUrl(result.url);
    setGeneratingImage(false);
    toast.success("Immagine generata!");
  };

  const handleSave = async () => {
    if (!recipe) return;
    setSaving(true);
    const data = {
      ...recipe,
      image_url: imageUrl || "",
      status: "pubblicata",
      gen_prompt: buildRecipePrompt(selectedOcc),
      numero_salvate: 0,
      numero_preparate: 0,
    };
    await base44.entities.Recipe.create(data);
    setSaving(false);
    toast.success("Ricetta pubblicata!");
    setRecipe(null);
    setImageUrl("");
    setExtraNote("");
  };

  if (loadingOcc) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Occasion selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4">
        <p className="text-sm font-bold text-gray-800">1. Seleziona l'occasione</p>
        {[
          { key: "giorno", label: "🏠 Occasioni del giorno" },
          { key: "speciale", label: "🎉 Occasioni speciali" },
          { key: "stile_vita", label: "🌿 Stile di vita e salute" },
        ].map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="flex flex-wrap gap-2">
              {grouped[key].map(occ => (
                <button
                  key={occ.id}
                  onClick={() => setSelectedOcc(occ)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedOcc?.id === occ.id
                      ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                      : "bg-gray-50 text-gray-600 border-gray-100 hover:border-[#2D6A4F]/30"
                  }`}
                >
                  {occ.icon} {occ.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected occasion preview */}
      {selectedOcc && (
        <div className="bg-[#F0F7F4] rounded-2xl p-4 border border-[#2D6A4F]/10">
          <p className="text-xs font-bold text-[#2D6A4F] mb-1">{selectedOcc.icon} {selectedOcc.label}</p>
          <p className="text-xs text-gray-500">Mood: {selectedOcc.mood}</p>
          {selectedOcc.linee_guida?.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {selectedOcc.linee_guida.map((g, i) => (
                <li key={i} className="text-xs text-gray-500">• {g}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Params */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
        <p className="text-sm font-bold text-gray-800">2. Parametri</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">Difficoltà</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none">
              {difficulties.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">Tempo (min)</label>
            <input type="number" value={maxTime} onChange={e => setMaxTime(Number(e.target.value))}
              className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">Porzioni</label>
            <input type="number" value={servings} onChange={e => setServings(Number(e.target.value))}
              className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold block mb-1">Note aggiuntive (opzionale)</label>
          <textarea value={extraNote} onChange={e => setExtraNote(e.target.value)}
            placeholder="Es: ricetta senza glutine, usa zucchine, piatto tipico siciliano..."
            rows={2}
            className="w-full text-xs px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none resize-none" />
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!selectedOcc || generating}
        className="w-full flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? "Generando ricetta..." : "Genera ricetta con AI"}
      </button>

      {/* Result */}
      {recipe && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4">
          <p className="text-sm font-bold text-gray-800">3. Risultato</p>

          {imageUrl && (
            <img src={imageUrl} alt={recipe.title} className="w-full h-48 object-cover rounded-xl" />
          )}

          <div>
            <p className="font-bold text-gray-900">{recipe.title}</p>
            <p className="text-xs text-gray-500 mt-1">{recipe.description}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-[#F0F7F4] text-[#2D6A4F] px-2 py-0.5 rounded-lg font-medium">{recipe.category}</span>
              <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">{recipe.difficulty}</span>
              <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">{recipe.prep_time} min</span>
              <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">{recipe.servings} porzioni</span>
              {recipe.calories && <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">{recipe.calories} kcal</span>}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-600 mb-1">Ingredienti ({recipe.ingredients?.length})</p>
            <div className="space-y-0.5">
              {recipe.ingredients?.map((ing, i) => (
                <p key={i} className="text-xs text-gray-500">• {ing.quantity} {ing.name}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-600 mb-1">Istruzioni ({recipe.instructions?.length} passi)</p>
            <div className="space-y-1">
              {recipe.instructions?.map((step, i) => (
                <p key={i} className="text-xs text-gray-500">{i + 1}. {step}</p>
              ))}
            </div>
          </div>

          {/* Image + Save buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleGenerateImage}
              disabled={generatingImage}
              className="flex-1 flex items-center justify-center gap-2 border border-[#2D6A4F] text-[#2D6A4F] py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
              {generatingImage ? "Generando..." : imageUrl ? "Rigenera foto" : "Genera foto"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salva in bozza"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}