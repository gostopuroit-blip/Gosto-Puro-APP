import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Image, Save, Loader2, ChevronDown, Plus, X, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

const difficulties = ["Facile", "Media", "Difficile"];
const categories = ["Colazione", "Pranzo", "Cena", "Dolce", "Snack", "Bevanda"];

const DIETARY_TAGS = [
  { label: "Senza glutine", icon: "🌾" },
  { label: "Senza lattosio", icon: "🥛" },
  { label: "Senza zucchero", icon: "🍬" },
  { label: "Vegano", icon: "🌱" },
  { label: "Vegetariano", icon: "🥦" },
  { label: "Low carb", icon: "🥗" },
  { label: "Alto contenuto proteico", icon: "💪" },
  { label: "Diabetico", icon: "🩺" },
  { label: "Detox", icon: "🌿" },
  { label: "Fit", icon: "🏋️" },
  { label: "Senza uova", icon: "🥚" },
  { label: "Senza frutti di mare", icon: "🦐" },
];

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

const INGREDIENT_DICTIONARY = {
  "mele": "mele", "pomodori": "pomodori", "cipolla": "cipolla", "aglio": "aglio", "carota": "carota", "celery": "sedano", "prezzemolo": "prezzemolo", "basilico": "basilico", "rosmarino": "rosmarino", "timo": "timo", "origano": "origano",
  "insalata": "insalata", "spinaci": "spinaci", "broccoli": "broccoli", "cavolo": "cavolo", "zucchina": "zucchina", "melanzana": "melanzana", "peperone": "peperone", "peperoni": "peperoni",
  "limone": "limone", "arancia": "arancia", "banana": "banana", "fragola": "fragola", "pera": "pera", "pesca": "pesca",
  "pollo": "pollo", "carne": "carne", "manzo": "manzo", "maiale": "maiale", "vitello": "vitello", "agnello": "agnello",
  "salmone": "salmone", "tonno": "tonno", "branzino": "branzino", "orata": "orata", "gamberi": "gamberi", "polpo": "polpo", "calamari": "calamari", "cozze": "cozze", "vongole": "vongole",
  "uova": "uova", "uovo": "uovo", "egg": "uova", "eggs": "uova",
  "latte": "latte", "panna": "panna", "formaggio": "formaggio", "mozzarella": "mozzarella", "parmigiano": "parmigiano", "ricotta": "ricotta", "mascarpone": "mascarpone", "feta": "feta",
  "pasta": "pasta", "riso": "riso", "farina": "farina", "pane": "pane", "olio": "olio", "burro": "burro", "sale": "sale", "zucchero": "zucchero", "pepe": "pepe",
  "aceto": "aceto", "salsa di soia": "salsa di soia", "miele": "miele", "sugo di pomodoro": "sugo di pomodoro", "polpa di pomodoro": "polpa di pomodoro",
};

const sanitizeIngredientName = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  if (INGREDIENT_DICTIONARY[lower]) return INGREDIENT_DICTIONARY[lower];
  return name.trim();
};

const countryProfiles = {
  "Giappone": {
    identity: "Cucina giapponese minimalista: equilibrio tra sapore, estetica e leggerezza. Ingredienti semplici ma di qualità, tagli precisi, presentazione ordinata.",
    dishes: "Ramen, Sushi, Udon, Gyoza, Donburi, Tempura, Onigiri, Miso soup",
    rules: [
      "Ricetta fedele alla tradizione giapponese",
      "Ingredienti reperibili in Italia (supermercati forniti o negozi asiatici)",
      "Nessuna reinterpretazione italiana inutile",
      "Porzioni equilibrate e bilanciate",
      "Non esagerare con fusion o contaminazioni",
      "Rispettare la filosofia giapponese: semplicità, precisione, rispetto dell'ingrediente",
    ],
    imageStyle: "minimal Japanese presentation, clean white ceramic plate or wooden tray, neutral background, natural soft light, no steam, no dramatic effects, no hands, precise clean plating, authentic Japanese aesthetic",
    promptExtra: "IMPORTANTE: Questa è autentica cucina giapponese. NON italianizzare. NON fare fusion. Il piatto deve sembrare uscito da un ristorante giapponese vero. Mantieni i nomi originali giapponesi. Ingredienti: se non reperibili facilmente, suggerisci alternative (es: brodo dashi → brodo con kombu e katsuobushi o sostituto).",
  },
  "Messico": {
    identity: "Cucina messicana autentica: sapore deciso, spezie equilibrate, colori vivi, cucina conviviale. NON tex-mex americano.",
    dishes: "Tacos, Quesadillas, Guacamole, Fajitas, Chili, Enchiladas, Pozole, Tamales",
    rules: [
      "Preferire versione autentica messicana, NON tex-mex americana",
      "Evitare eccesso di formaggi industriali",
      "Ingredienti freschi: coriandolo, lime, peperoncini, avocado, mais",
      "Piccante equilibrato e adatto al gusto europeo",
      "Sapori decisi ma non violenti",
    ],
    imageStyle: "rustic Mexican table, warm earthy tones, terracotta or colorful ceramic plates, vibrant fresh ingredients, natural light, no hands, authentic Mexican presentation, no Tex-Mex fast food aesthetic",
    promptExtra: "IMPORTANTE: Cucina messicana autentica, NON tex-mex da fast food americano. Usa ingredienti freschi, coriandolo vero, lime, peperoncini autentici. Il piatto deve sembrare cibo di strada messicano autentico o cucina casalinga messicana — non un Taco Bell.",
  },
  "India": {
    identity: "Cucina indiana: spezie protagoniste, piatti cremosi o speziati, profumi intensi, contrasto dolce-speziato.",
    dishes: "Curry, Tikka Masala, Dal, Riso Basmati, Naan, Biryani, Samosa, Chutney",
    rules: [
      "Uso corretto delle spezie: garam masala, curcuma, cumino, coriandolo, cardamomo",
      "Adattare la piccantezza al gusto europeo (non eccessivamente piccante)",
      "Ingredienti reperibili in Italia",
      "Non semplificare troppo il profilo aromatico",
      "Rispettare l'identità regionale quando possibile (Nord/Sud India)",
    ],
    imageStyle: "warm golden Indian tones, traditional bowl or serving dish, rich colorful spices visible, natural warm light, no hands, authentic Indian presentation, no explosion of spices, inviting and rich",
    promptExtra: "IMPORTANTE: Cucina indiana autentica con le spezie corrette. NON semplificare in un 'curry generico'. Usa le spezie in modo stratificato come si fa davvero. Il piatto deve sembrare uscito da una cucina indiana vera, non da un ristorante indiano 'alla europea'.",
  },
};

const FIXED_OCCASIONS = {
  giorno: [
    { id: "1", label: "Colazione", tipo: "giorno", icon: "☕" },
    { id: "2", label: "Pranzo", tipo: "giorno", icon: "🍝" },
    { id: "3", label: "Cena", tipo: "giorno", icon: "🍷" },
    { id: "4", label: "Leggera", tipo: "giorno", icon: "🥗" },
    { id: "5", label: "Dolci", tipo: "giorno", icon: "🍰" },
  ],
  speciale: [
    { id: "6", label: "In famiglia", tipo: "speciale", icon: "👨‍👩‍👧‍👦" },
    { id: "7", label: "Per due", tipo: "speciale", icon: "💕" },
    { id: "8", label: "Con amici", tipo: "speciale", icon: "🎉" },
    { id: "9", label: "Feste", tipo: "speciale", icon: "🎊" },
    { id: "10", label: "Estate", tipo: "speciale", icon: "☀️" },
    { id: "11", label: "Autunno", tipo: "speciale", icon: "🍂" },
    { id: "12", label: "Inverno", tipo: "speciale", icon: "❄️" },
    { id: "13", label: "Primavera", tipo: "speciale", icon: "🌸" },
    { id: "14", label: "Veloci", tipo: "speciale", icon: "⚡" },
    { id: "15", label: "Instagram", tipo: "speciale", icon: "📸" },
    { id: "16", label: "Natale", tipo: "speciale", icon: "🎄" },
    { id: "17", label: "Capodanno", tipo: "speciale", icon: "🎆" },
    { id: "18", label: "Dal mondo", tipo: "speciale", icon: "🌍" },
  ],
  stile_vita: [
    { id: "19", label: "275 Ricette Fitness Pratiche ed Economiche", tipo: "stile_vita", icon: "💪" },
    { id: "20", label: "Senza zucchero", tipo: "stile_vita", icon: "🍬" },
    { id: "21", label: "Detox", tipo: "stile_vita", icon: "🌿" },
    { id: "22", label: "365 Ricette Deliziose per Diabetici", tipo: "stile_vita", icon: "🩺" },
    { id: "23", label: "Proteiche", tipo: "stile_vita", icon: "🥚" },
    { id: "24", label: "Low carb", tipo: "stile_vita", icon: "🥗" },
  ],
};

export default function AdminRecipeGenerator() {
  const [occasions, setOccasions] = useState([]);
  const [loadingOcc, setLoadingOcc] = useState(true);
  const [selectedOcc, setSelectedOcc] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [existingTitles, setExistingTitles] = useState([]);

  // Nuovi params per dietary tags e categoria
  const [selectedCategory, setSelectedCategory] = useState("Pranzo");
  const [selectedDietaryTags, setSelectedDietaryTags] = useState([]);
  const [selectedLifestyleTags, setSelectedLifestyleTags] = useState("");
  const [targetKcal, setTargetKcal] = useState("");

  const [difficulty, setDifficulty] = useState("Facile");
  const [maxTime, setMaxTime] = useState(30);
  const [servings, setServings] = useState(4);
  const [extraNote, setExtraNote] = useState("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const isInternational = selectedOcc?.label?.toLowerCase().includes("cucina internazionale") || selectedOcc?.label?.toLowerCase().includes("dal mondo");

  const [recipe, setRecipe] = useState(null);
  const [recipeOcc, setRecipeOcc] = useState(null);
  const [recipeCountry, setRecipeCountry] = useState(null);
  const [editedCalories, setEditedCalories] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const flatOccasions = [...FIXED_OCCASIONS.giorno, ...FIXED_OCCASIONS.speciale, ...FIXED_OCCASIONS.stile_vita];
    setOccasions(flatOccasions);
    setLoadingOcc(false);
    
    base44.entities.AppConfig.filter({ key: "prompt_mestre" }).then(configs => {
      if (configs?.length > 0 && configs[0].value) setMasterPrompt(configs[0].value);
    });
    const loadAllTitles = async () => {
      let all = [];
      let skip = 0;
      const limit = 200;
      while (true) {
        const batch = await base44.entities.Recipe.list("-created_date", limit, skip);
        all = all.concat(batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      setExistingTitles(all.map(r => r.title));
    };
    loadAllTitles();
  }, []);

  // Quando seleziona occasione, pre-selezionare dietary tags corrispondenti
  useEffect(() => {
    if (!selectedOcc) return;
    const occLabel = selectedOcc.label?.toLowerCase() || "";
    const newTags = [];
    if (occLabel.includes("diabete")) newTags.push("Diabetico");
    if (occLabel.includes("fit")) newTags.push("Fit");
    if (occLabel.includes("detox")) newTags.push("Detox");
    if (occLabel.includes("low carb")) newTags.push("Low carb");
    setSelectedDietaryTags(newTags);
  }, [selectedOcc?.id]);

  const grouped = {
    giorno: FIXED_OCCASIONS.giorno,
    speciale: FIXED_OCCASIONS.speciale,
    stile_vita: FIXED_OCCASIONS.stile_vita,
  };

  const buildRecipePrompt = (occ, country = null) => {
    const guidelines = occ.linee_guida?.join("\n- ") || "";
    const label = occ.label?.toLowerCase() || "";

    const profile = country ? countryProfiles[country] : null;
    const countryBlock = profile ? `
=== CUCINA INTERNAZIONALE: ${country.toUpperCase()} ===
Identità culinaria: ${profile.identity}
Piatti tipici da cui ispirarsi: ${profile.dishes}
Regole specifiche:
- ${profile.rules.join("\n- ")}
${profile.promptExtra}
=== FINE SEZIONE PAESE ===
` : "";

    const dietaryTagsBlock = selectedDietaryTags.length > 0 ? `\nDIETARY TAGS PRE-SELEZIONATE:\nLa ricetta DEVE rispettare queste restrizioni/caratteristiche:\n- ${selectedDietaryTags.join("\n- ")}\n` : "";

    const targetKcalBlock = targetKcal ? `\nTARGET CALORICO: Mantieni la ricetta intorno a ${targetKcal} kcal per porzione.\n` : "";

    const lifestyleTagsBlock = selectedLifestyleTags ? `\nLIFESTYLE/OCCASIONI AGGIUNTIVE: ${selectedLifestyleTags}\n` : "";

    const titlesBlock = existingTitles.length > 0
      ? `\nRICETTE GIÀ ESISTENTI (NON RIPETERE MAI):\n${existingTitles.map(t => `- ${t}`).join("\n")}\n`
      : "";

    return `Sei uno chef esperto di cucina ${profile ? profile.identity.split(":")[0] : "italiana"}.

Crea una ricetta ${country ? `autentica di cucina ${country}` : "autentica italiana"} per questa occasione.
${titlesBlock}
${extraNote ? `\n🚨 VINCOLO ASSOLUTO — LEGGI PRIMA DI TUTTO:\nL'utente ha richiesto ESATTAMENTE: "${extraNote}"\nDevi creare LA RICETTA CHE L'UTENTE HA CHIESTO.\n` : ""}
Occasione: ${occ.label}${country ? ` — Paese: ${country}` : ""}
Categoria: ${selectedCategory}
Mood: ${occ.mood || ""}
Difficoltà: ${difficulty}
Tempo: circa ${maxTime} minuti
Porzioni: ${servings}
${dietaryTagsBlock}${targetKcalBlock}${lifestyleTagsBlock}
${countryBlock}
${!isInternational ? `Linee guida:\n- ${guidelines}` : ""}
${occ.prompt_extra ? `\n${occ.prompt_extra}` : ""}

═══════════════════════════════════════
REGOLE OBBLIGATORIE
═══════════════════════════════════════
La ricetta deve essere una vera preparazione culinaria con fase di preparazione E cottura reale.
È VIETATO generare semplici assemblaggi di ingredienti.

═══════════════════════════════════════
ANALISI AUTOMATICA DIETARY_TAGS — OBBLIGATORIA
═══════════════════════════════════════
Analizza gli ingredienti e i macros della ricetta e popola il campo "dietary_tags" con TUTTE le tag applicabili:
["Senza glutine", "Senza lattosio", "Senza zucchero", "Vegano", "Vegetariano", "Low carb", "Alto contenuto proteico", "Diabetico", "Detox", "Fit", "Senza uova", "Senza frutti di mare"]

Regole per applicare ogni tag:
- "Senza glutine" → nessun ingrediente contiene frumento, segale, orzo, avena
- "Senza lattosio" → nessun ingrediente contiene latte, formaggio, burro, panna, yogurt
- "Senza zucchero" → nessun ingrediente contiene zucchero, miele, sciroppo
- "Vegano" → nessun prodotto animale: niente carne, pesce, uova, latticini, miele
- "Vegetariano" → niente carne né pesce (ma può avere uova e latticini)
- "Low carb" → carboidrati < 20g per porzione
- "Alto contenuto proteico" → proteine > 20g per porzione
- "Diabetico" → zuccheri < 10g E carboidrati < 30g per porzione
- "Detox" → ricetta basata principalmente su verdure fresche, frutta, erbe, senza ingredienti processati
- "Fit" → calorie < 400 per porzione E bilanciata nei macros
- "Senza uova" → nessun ingrediente contiene uova
- "Senza frutti di mare" → nessun ingrediente contiene frutti di mare, crostacei

Rispondi SOLO in formato JSON:
{
  "title": "Nome ricetta",
  "description": "Una frase breve (max 20 parole)",
  "category": "${selectedCategory}",
  "prep_time": ${maxTime},
  "servings": ${servings},
  "calories": 320,
  "proteine": 25,
  "carboidrati": 35,
  "grassi": 12,
  "fibre": 5,
  "zuccheri": 8,
  "sodio": 400,
  "difficulty": "${difficulty}",
  "occasions": ["${occ.label}"],
  "lifestyle": [],
  "dietary_tags": [],
  "ingredients": [
    { "name": "ingrediente", "quantity": "quantità", "category": "Dispensa" }
  ],
  "instructions": [
    "Primo passo...",
    "Secondo passo..."
  ],
  "sostituzioni": [
    {
      "ingrediente_nome": "nome",
      "opzioni": [
        {
          "nome": "sostituto",
          "quantita": "quantità",
          "tags": ["Vegano"],
          "impatto_calorie": 0,
          "impatto_proteine": 0,
          "impatto_carboidrati": 0,
          "impatto_grassi": 0
        }
      ]
    }
  ]
}`;
  };

  const savePromptMaster = async () => {
    setSavingPrompt(true);
    const existing = await base44.entities.AppConfig.filter({ key: "prompt_mestre" });
    if (existing?.length > 0) {
      await base44.entities.AppConfig.update(existing[0].id, { value: masterPrompt });
    } else {
      await base44.entities.AppConfig.create({ key: "prompt_mestre", value: masterPrompt, label: "Prompt Mestre Generatore" });
    }
    setSavingPrompt(false);
    toast.success("Prompt salvato!");
  };

  const handleGenerate = async () => {
    if (!selectedOcc) return toast.error("Seleziona un'occasione");
    setGenerating(true);
    setRecipe(null);
    setImageUrl("");
    const basePrompt = buildRecipePrompt(selectedOcc, selectedCountry);
    const prompt = masterPrompt.trim()
      ? `${masterPrompt.trim()}\n\n===ISTRUZIONI RICETTA===\n\n${basePrompt}`
      : basePrompt;
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
          proteine: { type: "number" },
          carboidrati: { type: "number" },
          grassi: { type: "number" },
          fibre: { type: "number" },
          zuccheri: { type: "number" },
          sodio: { type: "number" },
          difficulty: { type: "string" },
          occasions: { type: "array", items: { type: "string" } },
          lifestyle: { type: "array", items: { type: "string" } },
          dietary_tags: { type: "array", items: { type: "string" } },
          ingredients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "string" }, category: { type: "string" } } } },
          instructions: { type: "array", items: { type: "string" } },
          sostituzioni: { type: "array", items: { type: "object" } },
        },
      },
    });

    const normalizedResult = result ? { ...result, prep_time: maxTime } : result;
    if (normalizedResult?.ingredients) {
      normalizedResult.ingredients = normalizedResult.ingredients.map(ing => ({
        ...ing,
        name: sanitizeIngredientName(ing.name)
      }));
    }
    
    setRecipe(normalizedResult);
    setRecipeOcc(selectedOcc);
    setRecipeCountry(selectedCountry);
    setEditedCalories(normalizedResult?.calories?.toString() || "");
    setGenerating(false);
    toast.success("Ricetta generata!");
  };

  const handleSave = async () => {
    if (!recipe) return;
    if (isInternational && !selectedCountry) {
      return toast.error("Seleziona il paese");
    }
    setSaving(true);
    try {
      const data = {
        title: recipe.title,
        description: recipe.description,
        category: recipe.category,
        prep_time: recipe.prep_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        occasions: recipe.occasions,
        lifestyle: recipe.lifestyle || [],
        dietary_tags: recipe.dietary_tags || [],
        proteine: recipe.proteine || 0,
        carboidrati: recipe.carboidrati || 0,
        grassi: recipe.grassi || 0,
        fibre: recipe.fibre || 0,
        zuccheri: recipe.zuccheri || 0,
        sodio: recipe.sodio || 0,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        sostituzioni: recipe.sostituzioni || [],
        calories: editedCalories ? Number(editedCalories) : recipe.calories,
        image_url: imageUrl || "",
        status: "bozza",
        numero_salvate: 0,
        numero_preparate: 0,
        ...(isInternational && selectedCountry ? { paese: selectedCountry } : {}),
      };
      await base44.entities.Recipe.create(data);
      toast.success("Ricetta salvata in bozza!");
      setRecipe(null);
      setImageUrl("");
      setSelectedDietaryTags([]);
      setSelectedCategory("Pranzo");
      setTargetKcal("");
    } catch (err) {
      toast.error("Errore: " + (err?.message || "riprova"));
    } finally {
      setSaving(false);
    }
  };

  if (loadingOcc) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Prompt Mestre */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-amber-800">🧠 Prompt Mestre</p>
          <button
            onClick={savePromptMaster}
            disabled={savingPrompt}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
          >
            {savingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookmarkCheck className="w-3 h-3" />}
            Salva
          </button>
        </div>
        <textarea
          value={masterPrompt}
          onChange={e => setMasterPrompt(e.target.value)}
          placeholder="Prompt master opzionale..."
          rows={3}
          className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200 bg-white focus:outline-none resize-none"
        />
      </div>

      {/* Occasione */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4">
        <p className="text-sm font-bold text-gray-800">1. Seleziona l'occasione</p>
        {[
          { key: "giorno", label: "🏠 Giorno" },
          { key: "speciale", label: "🎉 Speciale" },
        ].map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="flex flex-wrap gap-2">
              {grouped[key].map(occ => (
                <button
                  key={occ.id}
                  onClick={() => setSelectedOcc(occ)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
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

      {/* Categoria + Tags + Parametri */}
      {selectedOcc && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-800 mb-3">2. Categoria di ricetta</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
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

          <div>
            <p className="text-sm font-bold text-gray-800 mb-3">3. Dietary Tags (pre-selezionate)</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map(tag => (
                <button
                  key={tag.label}
                  onClick={() => {
                    setSelectedDietaryTags(prev =>
                      prev.includes(tag.label)
                        ? prev.filter(t => t !== tag.label)
                        : [...prev, tag.label]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedDietaryTags.includes(tag.label)
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-50 text-gray-600 border-gray-100"
                  }`}
                >
                  {tag.icon} {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">Difficoltà</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50">
                {difficulties.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">Tempo (min)</label>
              <input type="number" value={maxTime} onChange={e => setMaxTime(Number(e.target.value))}
                className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">Porzioni</label>
              <input type="number" value={servings} onChange={e => setServings(Number(e.target.value))}
                className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">Target kcal (opzionale)</label>
              <input type="number" value={targetKcal} onChange={e => setTargetKcal(e.target.value)}
                placeholder="Es: 350"
                className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">Lifestyle/Occasioni aggiuntive</label>
              <input type="text" value={selectedLifestyleTags} onChange={e => setSelectedLifestyleTags(e.target.value)}
                placeholder="Es: Air fryer, congelabile"
                className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">Note aggiuntive</label>
            <textarea value={extraNote} onChange={e => setExtraNote(e.target.value)}
              placeholder="Es: 'Pasta al Ragù', 'con melanzane', 'tipico siciliano'..."
              rows={2}
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 resize-none" />
          </div>
        </div>
      )}

      {isInternational && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
          <p className="text-sm font-bold text-gray-800">Paese</p>
          <div className="grid grid-cols-2 gap-2">
            {countries.map(country => (
              <button
                key={country.label}
                onClick={() => setSelectedCountry(country.label)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  selectedCountry === country.label
                    ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                    : "bg-gray-50 text-gray-600 border-gray-100"
                }`}
              >
                {country.flag} {country.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!selectedOcc || generating}
        className="w-full flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? "Generando..." : "Genera ricetta"}
      </button>

      {recipe && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4">
          <p className="text-sm font-bold text-gray-800">Preview</p>
          <div>
            <p className="font-bold text-gray-900">{recipe.title}</p>
            <p className="text-xs text-gray-500 mt-1">{recipe.description}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-[#F0F7F4] text-[#2D6A4F] px-2 py-0.5 rounded-lg font-medium">{recipe.category}</span>
              <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">{recipe.prep_time} min</span>
            </div>
          </div>

          {recipe.dietary_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.dietary_tags.map(tag => (
                <span key={tag} className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva in bozza
            </button>
          </div>
        </div>
      )}
    </div>
  );
}