import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Search, Loader2, X, Check, Upload, Sparkles, Image, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const categories = ["Colazione", "Pranzo", "Cena", "Dolce", "Snack", "Bevanda"];
const difficulties = ["Facile", "Media", "Difficile"];
const visibilities = ["all", "free", "premium"];
const countries = [
  { label: "Giappone", flag: "🇯🇵" },
  { label: "Messico", flag: "🇲🇽" },
  { label: "India", flag: "🇮🇳" },
  { label: "Thailandia", flag: "🇹🇭" },
  { label: "Spagna", flag: "🇪🇸" },
  { label: "Grecia", flag: "🇬🇷" },
  { label: "Stati Uniti", flag: "🇺🇸" },
  { label: "Francia", flag: "🇫🇷" },
  { label: "Cina", flag: "🇨🇳" },
  { label: "Marocco", flag: "🇲🇦" },
  { label: "Portogallo", flag: "🇵🇹" },
  { label: "Turchia", flag: "🇹🇷" },
  { label: "Libano", flag: "🇱🇧" },
  { label: "Perù", flag: "🇵🇪" },
  { label: "Vietnam", flag: "🇻🇳" },
];

const SOSTITUZIONE_TAGS = ["Vegano", "Vegetariano", "Senza glutine", "Senza lattosio", "Low carb", "Proteico", "Economico", "Facile da trovare"];
const LIFESTYLE_OPTIONS = ["Vegano", "Vegetariano", "Low carb", "Alto contenuto proteico", "Detox", "Fit"];
const DIETARY_TAGS_OPTIONS = ["Senza glutine", "Senza lattosio", "Senza uova", "Senza frutti di mare", "Diabetico", "Senza zucchero"];

const FIXED_OCCASIONS = [
  "Colazione",
  "Pranzo",
  "Cena",
  "Leggera",
  "Dolci",
  "Senza zucchero",
  "Detox",
  "Low carb",
  "365 Ricette Deliziose per Diabetici",
  "275 Ricette Fitness Pratiche ed Economiche",
  "Ricette Sane",
  "Veloci",
  "Friggitrice ad Aria",
  "Facili da Congelare"
];

const emptyForm = {
  title: "", description: "", image_url: "", category: "Pranzo",
  prep_time: 30, servings: 4, difficulty: "Facile", calories: null,
  ingredients: [{ name: "", quantity: "", category: "" }],
  instructions: [""], occasions: [], lifestyle: [],
  visibility: "premium", numero_salvate: 0, numero_preparate: 0,
  gen_prompt: "", status: "pubblicata", paese: "",
  sostituzioni: [],
};

export default function AdminRecipesManager() {
  const [recipes, setRecipes] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tutti");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [recipesData, occasionsData] = await Promise.all([
      base44.entities.Recipe.list("-created_date", 1000),
      base44.entities.RecipeOccasion.filter({ show_in_home: true }, "sort_order")
    ]);
    setRecipes(recipesData);
    setOccasions(occasionsData);
    setLoading(false);
  };

  const allOccasions = FIXED_OCCASIONS;

  const openNew = () => { setForm(emptyForm); setEditId(null); setPasteText(""); setShowPaste(true); setShowForm(true); };
  const openEdit = (r) => {
    setForm({
      ...emptyForm, ...r,
      ingredients: r.ingredients?.length ? r.ingredients : [{ name: "", quantity: "", category: "" }],
      instructions: r.instructions?.length ? r.instructions : [""],
      visibility: r.is_premium === true ? "premium" : r.is_premium === false ? "all" : "premium",
    });
    setEditId(r.id);
    setPasteText(""); setShowPaste(false);
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const handleGenerateRecipe = async () => {
    if (!form.gen_prompt.trim()) return toast.error("Inserisci un prompt prima di generare");
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un cuoco italiano esperto. Crea una ricetta italiana autentica basata su questo contesto:\n\n${form.gen_prompt}\n\nRispondi SOLO in formato JSON con questa struttura esatta:\n{\n  "title": "...",\n  "description": "Una frase breve e invitante (max 20 parole)",\n  "prep_time": 25,\n  "servings": 4,\n  "calories": 320,\n  "difficulty": "Facile",\n  "ingredients": [\n    { "name": "farina 00", "quantity": "200g", "category": "Dispensa" }\n  ],\n  "instructions": [\n    "Primo passo...",\n    "Secondo passo..."\n  ],\n  "calorie": 320,\n  "proteine": 12,\n  "carboidrati": 45,\n  "grassi": 8,\n  "fibre": 3,\n  "zuccheri": 5,\n  "sodio": 420\n}\n\nCategorie valide per ingredienti: Ortofrutta, Carne e pesce, Latticini, Dispensa, Surgelati, Altro.\nDifficoltà valide: Facile, Media, Difficile.\nUsa ingredienti tipici italiani. Le istruzioni siano chiare e dettagliate.\nCalcola i valori nutrizionali (calorie, proteine, carboidrati, grassi, fibre, zuccheri, sodio) in modo realistico e preciso per porzione, basandoti sugli ingredienti e quantità della ricetta.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          prep_time: { type: "number" },
          servings: { type: "number" },
          calories: { type: "number" },
          difficulty: { type: "string" },
          ingredients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "string" }, category: { type: "string" } } } },
          instructions: { type: "array", items: { type: "string" } },
          calorie: { type: "number" },
          proteine: { type: "number" },
          carboidrati: { type: "number" },
          grassi: { type: "number" },
          fibre: { type: "number" },
          zuccheri: { type: "number" },
          sodio: { type: "number" },
        },
      },
    });
    setForm((f) => ({
      ...f,
      title: result.title || f.title,
      description: result.description || f.description,
      prep_time: result.prep_time || f.prep_time,
      servings: result.servings || f.servings,
      calories: result.calories || f.calories,
      difficulty: result.difficulty || f.difficulty,
      ingredients: result.ingredients?.length ? result.ingredients : f.ingredients,
      instructions: result.instructions?.length ? result.instructions : f.instructions,
      calorie: result.calorie || f.calorie,
      proteine: result.proteine || f.proteine,
      carboidrati: result.carboidrati || f.carboidrati,
      grassi: result.grassi || f.grassi,
      fibre: result.fibre || f.fibre,
      zuccheri: result.zuccheri || f.zuccheri,
      sodio: result.sodio || f.sodio,
    }));
    setGenerating(false);
    toast.success("Ricetta generata! Controlla e modifica se necessario.");
  };

  const handleGenerateImage = async () => {
    if (!form.gen_prompt.trim() && !form.title.trim()) return toast.error("Inserisci un prompt o un titolo");
    setGeneratingImage(true);
    const imagePrompt = form.gen_prompt.trim()
      ? `Professional food photography: ${form.gen_prompt}. Italian cuisine, ${form.category || "food"}, restaurant quality, natural light, high resolution, beautiful plating.`
      : `Professional food photography of "${form.title}", Italian ${form.category} recipe, restaurant quality, natural soft light, beautiful plating, high resolution.`;
    const result = await base44.integrations.Core.GenerateImage({ prompt: imagePrompt });
    setForm((f) => ({ ...f, image_url: result.url }));
    setGeneratingImage(false);
    toast.success("Immagine generata!");
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Inserisci un titolo");
    setSaving(true);
    const cleanIngredients = form.ingredients.filter((i) => i.name.trim());
    const cleanInstructions = form.instructions.filter((s) => s.trim());
    const data = { ...form, ingredients: cleanIngredients, instructions: cleanInstructions, prep_time: Number(form.prep_time) || 30, is_premium: form.visibility === "premium" };
    if (editId) {
      await base44.entities.Recipe.update(editId, data);
      setRecipes((prev) => prev.map((r) => r.id === editId ? { ...r, ...data } : r));
      toast.success("Ricetta aggiornata!");
    } else {
      const created = await base44.entities.Recipe.create(data);
      setRecipes((prev) => [created, ...prev]);
      toast.success("Ricetta creata!");
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa ricetta?")) return;
    setDeleting(id);
    await base44.entities.Recipe.delete(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setDeleting(null);
    toast.success("Ricetta eliminata");
  };

  const filtered = recipes.filter((r) => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "Tutti" || r.category === catFilter;
    return matchSearch && matchCat;
  });

  const setIng = (i, field, val) => {
    const ings = [...form.ingredients];
    ings[i] = { ...ings[i], [field]: val };
    setForm((f) => ({ ...f, ingredients: ings }));
  };

  const setStep = (i, val) => {
    const steps = [...form.instructions];
    steps[i] = val;
    setForm((f) => ({ ...f, instructions: steps }));
  };

  const [interpreting, setInterpreting] = useState(false);

  const parseReceitaPrompt = (text) => {
    const result = {};

    // CATEGORIA
    const catMatch = text.match(/CATEGORIA\s+(\w+)/);
    if (catMatch) result.category = catMatch[1];

    // DIFFICOLTÀ
    const diffMatch = text.match(/DIFFICOLT[ÀA]\s+(\w+)/);
    if (diffMatch) result.difficulty = diffMatch[1];

    // TEMPO
    const tempoMatch = text.match(/TEMPO[^0-9]*(\d+)/);
    if (tempoMatch) result.prep_time = parseInt(tempoMatch[1]);

    // PORZIONI
    const porzioniMatch = text.match(/PORZIONI\s+(\d+)/);
    if (porzioniMatch) result.servings = parseInt(porzioniMatch[1]);

    // KCAL - múltiplas tentativas
    const kcalMatch = text.match(/KCAL\s+(\d+)/) || text.match(/(\d+)\s*kcal/i) || text.match(/🔥[^\d]*(\d+)/);
    if (kcalMatch) result.calorie = parseInt(kcalMatch[1]);

    // VALORI NUTRIZIONALI
    const protMatch = text.match(/Proteine[:\s]+(\d+)/i);
    if (protMatch) result.proteine = parseInt(protMatch[1]);

    const carbMatch = text.match(/Carboidrati[:\s]+(\d+)/i);
    if (carbMatch) result.carboidrati = parseInt(carbMatch[1]);

    const grassiMatch = text.match(/Grassi[:\s]+(\d+)/i);
    if (grassiMatch) result.grassi = parseInt(grassiMatch[1]);

    const fibreMatch = text.match(/Fibre[:\s]+(\d+)/i);
    if (fibreMatch) result.fibre = parseInt(fibreMatch[1]);

    const zuccheriMatch = text.match(/Zuccheri[:\s]+(\d+)/i);
    if (zuccheriMatch) result.zuccheri = parseInt(zuccheriMatch[1]);

    const sodioMatch = text.match(/Sodio[:\s]+(\d+)/i);
    if (sodioMatch) result.sodio = parseInt(sodioMatch[1]);

    // TITOLO / DESCRIZIONE BREVE
    const titleMatch = text.match(/DESCRIZIONE BREVE\s*\n([^\n]+)/i);
    if (titleMatch) result.description = titleMatch[1].trim();

    // INGREDIENTI
    const ingredientiSection = text.match(/INGREDIENTI\s*\n([\s\S]*?)(?=👨|PROCEDIMENTO)/i);
    if (ingredientiSection) {
      const lines = ingredientiSection[1].split('\n').filter(l => l.trim());
      result.ingredients = lines.map(line => {
        const parts = line.split(/—|->/);
        return { name: parts[0]?.trim(), quantity: parts[1]?.trim() || '', category: 'Dispensa' };
      }).filter(i => i.name);
    }

    // ISTRUZIONI
    const procedimentoSection = text.match(/PROCEDIMENTO\s*\n([\s\S]*?)(?=📝|DESCRIZIONE|VALORI|💊|🔄|$)/i);
    if (procedimentoSection) {
      const lines = procedimentoSection[1].split(/Passo \d+\s*/i).filter(l => l.trim());
      result.instructions = lines;
    }

    // OCCASIONI - basato sulla categoria + keywords
    const occasioni = [];
    const catOccasionMap = { "Colazione": "Colazione", "Pranzo": "Pranzo", "Cena": "Cena", "Dolce": "Dolci" };
    if (result.category && catOccasionMap[result.category]) occasioni.push(catOccasionMap[result.category]);
    if (text.match(/fit/i)) occasioni.push('Fit');
    if (text.match(/diabet/i)) occasioni.push('Diabete');
    if (text.match(/detox/i)) occasioni.push('Detox');
    if (text.match(/low carb/i)) occasioni.push('Low carb');
    if (text.match(/friggitrice/i)) occasioni.push('Friggitrice ad Aria');
    result.occasions = occasioni;

    // SOSTITUZIONI (🔄)
    const sostSection = text.match(/🔄[^\n]*\n([\s\S]*?)(?=\n[📂🎯⏱🍽🔥🧄👨📝💊]|\n---|$)/);
    if (sostSection) {
      const lines = sostSection[1].split('\n').map(l => l.trim()).filter(l => l.includes('→'));
      const byIngredient = {};
      lines.forEach(line => {
        const arrowParts = line.split('→');
        if (arrowParts.length < 2) return;
        const ingNome = arrowParts[0].trim().replace(/^[•\-\*]+\s*/, '');
        const rest = arrowParts.slice(1).join('→');
        const segments = rest.split('|').map(s => s.trim());
        const firstSeg = segments[0] || "";
        const qMatch = firstSeg.match(/^(.+?)\s*\(([^)]+)\)/);
        const nome = qMatch ? qMatch[1].trim() : firstSeg.trim();
        const quantita = qMatch ? qMatch[2].trim() : "";
        let tags = [];
        const tagSeg = segments.find(s => /^tags?:/i.test(s));
        if (tagSeg) tags = tagSeg.replace(/^tags?:\s*/i, '').split(',').map(t => t.trim()).filter(Boolean);
        let impatto_calorie = 0, impatto_proteine = 0, impatto_carboidrati = 0, impatto_grassi = 0;
        const impattoSeg = segments.find(s => /^impatto:/i.test(s));
        if (impattoSeg) {
          const imp = impattoSeg.replace(/^impatto:\s*/i, '');
          const km = imp.match(/([+\-]?\d+)\s*kcal/i);
          const pm = imp.match(/([+\-]?\d+)\s*g?\s*prot/i);
          const cm = imp.match(/([+\-]?\d+)\s*g?\s*carb/i);
          const gm = imp.match(/([+\-]?\d+)\s*g?\s*gras/i);
          if (km) impatto_calorie = parseInt(km[1]);
          if (pm) impatto_proteine = parseInt(pm[1]);
          if (cm) impatto_carboidrati = parseInt(cm[1]);
          if (gm) impatto_grassi = parseInt(gm[1]);
        }
        if (!byIngredient[ingNome]) byIngredient[ingNome] = [];
        byIngredient[ingNome].push({ nome, quantita, tags, impatto_calorie, impatto_proteine, impatto_carboidrati, impatto_grassi });
      });
      result.sostituzioni = Object.entries(byIngredient).map(([ingrediente_nome, opzioni]) => ({ ingrediente_nome, opzioni }));
    }

    console.log('[Parser] result:', result);
    return result;
  };

  const handleParsePaste = async () => {
    const text = pasteText;
    if (!text.trim()) return;

    setInterpreting(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analizza il seguente testo di una ricetta e restituisci SOLO un oggetto JSON valido, senza markdown, senza backtick, senza testo extra. Il JSON deve avere esattamente questi campi:
{
  "title": "string",
  "description": "string (testo della DESCRIZIONE BREVE)",
  "category": "string (Colazione|Pranzo|Cena|Dolce|Snack|Bevanda)",
  "difficulty": "string (Facile|Media|Difficile)",
  "prep_time": number,
  "servings": number,
  "calorie": number,
  "proteine": number,
  "carboidrati": number,
  "grassi": number,
  "fibre": number,
  "zuccheri": number,
  "sodio": number,
  "occasions": ["array di stringhe con le occasioni rilevate"],
  "ingredients": [{"name": "string", "quantity": "string", "category": "Dispensa"}],
  "instructions": ["array di stringhe, un passo per elemento"],
  "sostituzioni": [{"ingrediente_nome": "string", "opzioni": [{"nome": "string", "quantita": "string", "tags": ["string"], "impatto_calorie": number, "impatto_proteine": number, "impatto_carboidrati": number, "impatto_grassi": number}]}]
}
IMPORTANTE: Il campo 'calorie' deve essere estratto dalla riga 'KCAL: 320' o 'KCAL 320'. È un numero intero. NON lasciare null. Se trovi 'KCAL' seguito da un numero, quel numero VA nel campo 'calorie'.
Testo della ricetta:\n${text}`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
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
          occasions: { type: "array", items: { type: "string" } },
          ingredients: { type: "array", items: { type: "object" } },
          instructions: { type: "array", items: { type: "string" } },
          sostituzioni: { type: "array", items: { type: "object" } },
        },
      },
    });
    setInterpreting(false);

    const parsed = result;
    if (!parsed.calorie) {
      const kcalMatch = text.match(/KCAL[:\s]+(\d+)/i);
      if (kcalMatch) parsed.calorie = parseInt(kcalMatch[1]);
    }

    // Deriva lifestyle e dietary_tags dagli ingredienti e macros
    const ingNames = (parsed.ingredients || []).map(i => (i.name || "").toLowerCase()).join(" ");
    const cal = parsed.calorie || 0;
    const prot = parsed.proteine || 0;
    const carb = parsed.carboidrati || 0;
    const zucc = parsed.zuccheri || 0;

    const hasAnimal = /carne\b|pollo|manzo|maiale|salmone|tonno|pesce\b|prosciutto|pancetta|uov|burro|latte\b|formaggio|panna|yogurt|miele|gamberi|frutti di mare|acciughe|ricotta|mozzarella|parmigiano|pecorino|grana/.test(ingNames);
    const hasMeat = /carne\b|pollo|manzo|maiale|salmone|tonno|pesce\b|prosciutto|pancetta|gamberi|acciughe/.test(ingNames);
    const hasGluten = /farina 0\b|farina di grano|farina di frumento|pasta\b|pane\b|orzo\b|segale|farro|semola/.test(ingNames);
    const hasLactose = /latte\b|formaggio|panna|burro|yogurt|ricotta|mozzarella|parmigiano|pecorino|grana/.test(ingNames);
    const hasEggs = /uov/.test(ingNames);
    const hasSeafood = /gamberi|frutti di mare|acciughe|vongole|cozze|calamari|polpo/.test(ingNames);
    const hasSugar = /zucchero|miele|sciroppo/.test(ingNames);

    const derivedDietary = [];
    if (!hasGluten) derivedDietary.push("Senza glutine");
    if (!hasLactose) derivedDietary.push("Senza lattosio");
    if (!hasSugar && zucc < 5) derivedDietary.push("Senza zucchero");
    if (carb < 20) derivedDietary.push("Low carb");
    if (prot > 20) derivedDietary.push("Alto contenuto proteico");
    if (zucc < 10 && carb < 30) derivedDietary.push("Diabetico");
    if (!hasEggs) derivedDietary.push("Senza uova");
    if (!hasSeafood) derivedDietary.push("Senza frutti di mare");

    const derivedLifestyle = [];
    if (!hasAnimal) derivedLifestyle.push("Vegano");
    if (!hasMeat) derivedLifestyle.push("Vegetariano");
    if (cal < 400 && prot >= carb) derivedLifestyle.push("Fit");
    if (prot > 20) derivedLifestyle.push("Alto contenuto proteico");
    if (carb < 20) derivedLifestyle.push("Low carb");

    setForm(f => ({
      ...f,
      ...(parsed.title ? { title: parsed.title } : {}),
      ...(parsed.description ? { description: parsed.description } : {}),
      ...(parsed.category ? { category: parsed.category } : {}),
      ...(parsed.difficulty ? { difficulty: parsed.difficulty } : {}),
      ...(parsed.prep_time != null ? { prep_time: parsed.prep_time } : {}),
      ...(parsed.servings != null ? { servings: parsed.servings } : {}),
      ...(parsed.calorie != null ? { calorie: parsed.calorie, calories: parsed.calorie } : {}),
      ...(parsed.proteine != null ? { proteine: parsed.proteine } : {}),
      ...(parsed.carboidrati != null ? { carboidrati: parsed.carboidrati } : {}),
      ...(parsed.grassi != null ? { grassi: parsed.grassi } : {}),
      ...(parsed.fibre != null ? { fibre: parsed.fibre } : {}),
      ...(parsed.zuccheri != null ? { zuccheri: parsed.zuccheri } : {}),
      ...(parsed.sodio != null ? { sodio: parsed.sodio } : {}),
      ...(parsed.ingredients?.length ? { ingredients: parsed.ingredients } : {}),
      ...(parsed.instructions?.length ? { instructions: parsed.instructions } : {}),
      ...(parsed.occasions?.length ? { occasions: [...new Set([...(f.occasions || []), ...parsed.occasions])] } : {}),
      ...(parsed.sostituzioni?.length ? { sostituzioni: parsed.sostituzioni } : {}),
      lifestyle: derivedLifestyle,
      dietary_tags: derivedDietary,
    }));
    setShowPaste(false);
    toast.success("Ricetta interpretata! Controlla e modifica se necessario.");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Search + New */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 text-sm bg-white focus:outline-none" placeholder="Cerca ricetta..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openNew} className="flex items-center gap-1 bg-[#2D6A4F] text-white px-4 py-2.5 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuova
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {["Tutti", ...categories].map((c) => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === c ? "bg-[#2D6A4F] text-white" : "bg-white border border-gray-100 text-gray-500"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {r.image_url ? <img src={r.image_url} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-xl">🍽️</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{r.title}</p>
              <p className="text-[10px] text-gray-400">{r.category} · {r.prep_time}min</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => openEdit(r)} className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Pencil className="w-3.5 h-3.5 text-blue-500" />
              </button>
              <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                {deleting === r.id ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Nessuna ricetta trovata</p>}
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica Ricetta" : "Nuova Ricetta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Incolla Ricetta */}
            {showPaste && (
              <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100 space-y-2">
                <label className="text-[10px] text-blue-600 font-semibold uppercase">📋 Incolla la ricetta formattata</label>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Incolla qui la ricetta nel formato Gosto Puro..."
                  rows={5}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-blue-200 bg-white focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleParsePaste}
                    disabled={!pasteText.trim() || interpreting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {interpreting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardPaste className="w-3.5 h-3.5" />}
                    {interpreting ? "Interpretazione in corso..." : "Interpreta e Compila"}
                  </button>
                  <button type="button" onClick={() => setShowPaste(false)} className="px-3 py-2 rounded-xl border border-blue-200 text-blue-500 text-xs font-semibold">
                    Salta
                  </button>
                </div>
              </div>
            )}
            {!showPaste && (
              <button type="button" onClick={() => setShowPaste(true)} className="text-[10px] text-blue-500 font-semibold flex items-center gap-1">
                <ClipboardPaste className="w-3 h-3" /> Mostra campo incolla ricetta
              </button>
            )}
            {/* Prompt AI */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Prompt di generazione AI</label>
              <textarea
                placeholder="Descrivi la ricetta: atmosfera, occasione, ingredienti chiave, stile visivo per l'immagine..."
                value={form.gen_prompt}
                onChange={(e) => setForm({ ...form, gen_prompt: e.target.value })}
                className="w-full mt-1 rounded-xl border border-gray-100 px-3 py-2.5 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20"
              />
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={handleGenerateRecipe}
                  disabled={generating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold transition-all hover:bg-[#235c43] disabled:opacity-60"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {generating ? "Genero..." : "Genera ricetta"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#E07A3A] text-white text-xs font-bold transition-all hover:bg-[#c86a2e] disabled:opacity-60"
                >
                  {generatingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                  {generatingImage ? "Genero..." : "Genera immagine"}
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="relative w-full h-32 bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100">
              {form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" /> : <span className="text-4xl">🍽️</span>}
              <label className="absolute bottom-2 right-2 bg-[#2D6A4F] text-white p-2 rounded-xl cursor-pointer shadow">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <Input placeholder="Titolo *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" />
            <textarea placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm resize-none h-20 focus:outline-none" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 rounded-xl border border-gray-100 px-3 py-2 text-sm bg-white focus:outline-none">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Difficoltà</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full mt-1 rounded-xl border border-gray-100 px-3 py-2 text-sm bg-white focus:outline-none">
                  {difficulties.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Tempo (min)</label>
                <Input type="number" value={form.prep_time} onChange={(e) => setForm({ ...form, prep_time: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Porzioni</label>
                <Input type="number" value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">kcal</label>
                <Input type="number" value={form.calories || form.calorie || ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setForm({ ...form, calories: v, calorie: v }); }} className="rounded-xl mt-1" />
              </div>
            </div>

            {/* Valori Nutrizionali */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Valori Nutrizionali (per porzione)</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {[
                  { key: "calorie", label: "Calorie (kcal)" },
                  { key: "proteine", label: "Proteine (g)" },
                  { key: "carboidrati", label: "Carboidrati (g)" },
                  { key: "grassi", label: "Grassi (g)" },
                  { key: "fibre", label: "Fibre (g)" },
                  { key: "zuccheri", label: "Zuccheri (g)" },
                  { key: "sodio", label: "Sodio (mg)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[10px] text-gray-400">{label}</label>
                    <Input type="number" placeholder="—" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : null })} className="rounded-xl mt-0.5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Occasions */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Occasioni</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {allOccasions.map((o) => {
                  const selected = form.occasions?.includes(o);
                  return (
                    <button key={o} type="button"
                      onClick={() => setForm((f) => ({ ...f, occasions: selected ? f.occasions.filter((x) => x !== o) : [...(f.occasions || []), o] }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${selected ? "bg-[#2D6A4F] text-white border-[#2D6A4F]" : "border-gray-100 text-gray-500 bg-white"}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Lifestyle */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Stile di vita</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {LIFESTYLE_OPTIONS.map((l) => {
                   const selected = form.lifestyle?.includes(l);
                   return (
                     <button key={l} type="button"
                       onClick={() => setForm((f) => ({ ...f, lifestyle: selected ? f.lifestyle.filter((x) => x !== l) : [...(f.lifestyle || []), l] }))}
                       className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${selected ? "bg-[#E07A3A] text-white border-[#E07A3A]" : "border-gray-100 text-gray-500 bg-white"}`}>
                       {l}
                     </button>
                   );
                 })}
              </div>
            </div>

            {/* Dietary Tags */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Tag Dietetici</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {DIETARY_TAGS_OPTIONS.map((tag) => {
                  const selected = (form.dietary_tags || []).includes(tag);
                  return (
                    <button key={tag} type="button"
                      onClick={() => setForm((f) => ({ ...f, dietary_tags: selected ? (f.dietary_tags || []).filter((x) => x !== tag) : [...(f.dietary_tags || []), tag] }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${selected ? "bg-green-600 text-white border-green-600" : "border-gray-100 text-gray-500 bg-white"}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Visibilità</label>
              <div className="flex gap-2 mt-1">
                {visibilities.map((v) => (
                  <button key={v} onClick={() => setForm({ ...form, visibility: v })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.visibility === v ? "bg-[#2D6A4F] text-white border-[#2D6A4F]" : "border-gray-100 text-gray-500"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Ingredienti</label>
                <button onClick={() => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { name: "", quantity: "", category: "" }] }))} className="text-[10px] text-[#2D6A4F] font-bold">+ Aggiungi</button>
              </div>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <Input placeholder="Nome" value={ing.name} onChange={(e) => setIng(i, "name", e.target.value)} className="rounded-lg flex-1" />
                  <Input placeholder="Qtà" value={ing.quantity} onChange={(e) => setIng(i, "quantity", e.target.value)} className="rounded-lg w-20" />
                  <button onClick={() => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) }))} className="text-gray-300 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Procedimento</label>
                <button onClick={() => setForm((f) => ({ ...f, instructions: [...f.instructions, ""] }))} className="text-[10px] text-[#2D6A4F] font-bold">+ Passo</button>
              </div>
              {form.instructions.map((step, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <span className="w-6 h-9 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">{i + 1}</span>
                  <textarea
                    placeholder={`Passo ${i + 1}`}
                    value={step}
                    onChange={(e) => setStep(i, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-100 px-3 py-2 text-sm resize-none h-16 focus:outline-none"
                  />
                  <button onClick={() => setForm((f) => ({ ...f, instructions: f.instructions.filter((_, j) => j !== i) }))} className="text-gray-300 hover:text-red-400 self-start mt-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Sostituzioni Ingredienti */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Sostituzioni Ingredienti</label>
              <div className="mt-2 space-y-3">
                {form.ingredients.filter(ing => ing.name.trim()).map((ing, ingIdx) => {
                  const sostEntry = (form.sostituzioni || []).find(s => s.ingrediente_nome === ing.name);
                  const opzioni = sostEntry?.opzioni || [];
                  const updateSost = (newOpzioni) => {
                    const existing = (form.sostituzioni || []).filter(s => s.ingrediente_nome !== ing.name);
                    setForm(f => ({ ...f, sostituzioni: newOpzioni.length > 0 ? [...existing, { ingrediente_nome: ing.name, opzioni: newOpzioni }] : existing }));
                  };
                  return (
                    <div key={ingIdx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700">🥄 {ing.name}</span>
                        <button type="button" onClick={() => updateSost([...opzioni, { nome: "", quantita: "", tags: [], impatto_calorie: 0, impatto_proteine: 0, impatto_carboidrati: 0, impatto_grassi: 0 }])}
                          className="text-[10px] text-[#2D6A4F] font-bold">+ Aggiungi sostituzione</button>
                      </div>
                      {opzioni.map((opt, optIdx) => (
                        <div key={optIdx} className="bg-white rounded-lg p-2.5 mb-2 border border-gray-100 space-y-2">
                          <div className="flex gap-1.5 items-start">
                            <Input placeholder="Nome sostituto" value={opt.nome} onChange={e => { const o=[...opzioni]; o[optIdx]={...o[optIdx],nome:e.target.value}; updateSost(o); }} className="rounded-lg flex-1 text-xs" />
                            <Input placeholder="Quantità" value={opt.quantita} onChange={e => { const o=[...opzioni]; o[optIdx]={...o[optIdx],quantita:e.target.value}; updateSost(o); }} className="rounded-lg w-20 text-xs" />
                            <button type="button" onClick={() => { const o=opzioni.filter((_,j)=>j!==optIdx); updateSost(o); }} className="text-gray-300 hover:text-red-400 mt-1.5"><X className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {[{k:"impatto_calorie",l:"kcal"},{k:"impatto_proteine",l:"Prot"},{k:"impatto_carboidrati",l:"Carb"},{k:"impatto_grassi",l:"Grass"}].map(({k,l}) => (
                              <div key={k}>
                                <label className="text-[9px] text-gray-400">{l}</label>
                                <Input type="number" placeholder="0" value={opt[k] || ""} onChange={e => { const o=[...opzioni]; o[optIdx]={...o[optIdx],[k]:e.target.value?Number(e.target.value):0}; updateSost(o); }} className="rounded-lg text-xs mt-0.5" />
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {SOSTITUZIONE_TAGS.map(tag => (
                              <button key={tag} type="button"
                                onClick={() => { const o=[...opzioni]; const tags=o[optIdx].tags||[]; o[optIdx]={...o[optIdx],tags:tags.includes(tag)?tags.filter(t=>t!==tag):[...tags,tag]}; updateSost(o); }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${(opt.tags||[]).includes(tag)?"bg-[#2D6A4F] text-white border-[#2D6A4F]":"border-gray-100 text-gray-500 bg-white"}`}>
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {form.ingredients.filter(i => i.name.trim()).length === 0 && (
                  <p className="text-[11px] text-gray-400 text-center py-2">Aggiungi prima gli ingredienti</p>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl bg-[#2D6A4F] hover:bg-[#235c43] font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {editId ? "Aggiorna ricetta" : "Crea ricetta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}