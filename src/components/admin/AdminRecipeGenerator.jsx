import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Image, Save, Loader2, ChevronDown, Plus, X, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

const difficulties = ["Facile", "Media", "Difficile"];
const categories = ["Colazione", "Pranzo", "Cena", "Dolce", "Snack", "Bevanda"];

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
  // Ortofrutta
  "mele": "mele", "pomodori": "pomodori", "cipolla": "cipolla", "aglio": "aglio", "carota": "carota", "celery": "sedano", "prezzemolo": "prezzemolo", "basilico": "basilico", "rosmarino": "rosmarino", "timo": "timo", "origano": "origano",
  "insalata": "insalata", "spinaci": "spinaci", "broccoli": "broccoli", "cavolo": "cavolo", "zucchina": "zucchina", "melanzana": "melanzana", "peperone": "peperone", "peperoni": "peperoni",
  "limone": "limone", "arancia": "arancia", "banana": "banana", "fragola": "fragola", "pera": "pera", "pesca": "pesca",
  // Carne e pesce
  "pollo": "pollo", "carne": "carne", "manzo": "manzo", "maiale": "maiale", "vitello": "vitello", "agnello": "agnello",
  "salmone": "salmone", "tonno": "tonno", "branzino": "branzino", "orata": "orata", "gamberi": "gamberi", "polpo": "polpo", "calamari": "calamari", "cozze": "cozze", "vongole": "vongole",
  "uova": "uova", "uovo": "uovo", "egg": "uova", "eggs": "uova",
  // Latticini
  "latte": "latte", "panna": "panna", "formaggio": "formaggio", "mozzarella": "mozzarella", "parmigiano": "parmigiano", "ricotta": "ricotta", "mascarpone": "mascarpone", "feta": "feta",
  // Dispensa
  "pasta": "pasta", "riso": "riso", "farina": "farina", "pane": "pane", "olio": "olio", "burro": "burro", "sale": "sale", "zucchero": "zucchero", "pepe": "pepe",
  "aceto": "aceto", "salsa di soia": "salsa di soia", "miele": "miele", "sugo di pomodoro": "sugo di pomodoro", "polpa di pomodoro": "polpa di pomodoro",
};

const sanitizeIngredientName = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  // Check if it's in our dictionary
  if (INGREDIENT_DICTIONARY[lower]) return INGREDIENT_DICTIONARY[lower];
  // If not, return as-is (will be reviewed by admin)
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
  "Thailandia": {
    identity: "Cucina tailandese: equilibrio perfetto tra dolce, salato, acido e piccante. Piatti freschi ma aromatici, profumati.",
    dishes: "Pad Thai, Curry tailandese (green/red/massaman), Tom Yum, Som Tam, Larb, Khao Pad",
    rules: [
      "Mantenere l'equilibrio fondamentale dolce-salato-acido-piccante",
      "Non italianizzare",
      "Evitare ingredienti impossibili da trovare (suggerire alternative)",
      "Piccante controllato ma presente",
      "Salsa di pesce, lemongrass, galangal, foglie di lime kaffir sono fondamentali",
    ],
    imageStyle: "fresh vibrant Thai presentation, clean white or dark ceramic plate, bright natural daylight, visible fresh herbs and lime, authentic Thai colors, no hands, no artificial effects, clean composition",
    promptExtra: "IMPORTANTE: Cucina tailandese autentica. L'equilibrio dei 4 sapori (dolce-salato-acido-piccante) è FONDAMENTALE e non può mancare. Non fare fusion. Se un ingrediente non è reperibile, suggerisci un sostituto pratico tra parentesi.",
  },
  "Spagna": {
    identity: "Cucina spagnola: conviviale, ingredienti mediterranei, piatti da condividere. Autentica iberica, non italiana.",
    dishes: "Paella, Tortilla española, Tapas, Gazpacho, Patatas bravas, Croquetas, Pan con tomate, Albóndigas",
    rules: [
      "Ricetta fedele alla tradizione spagnola",
      "Ingredienti mediterranei: paprika, zafferano, chorizo, manchego, olive spagnole",
      "Non trasformare in cucina italiana — sono cucine diverse",
      "Porzioni generose, spirito conviviale",
      "Differenziare per regione quando rilevante (Catalogna, Andalusia, Paesi Baschi)",
    ],
    imageStyle: "rustic Spanish table, warm Mediterranean light, terracotta or traditional Spanish ceramic, communal serving dish, warm amber tones, no hands, authentic Spanish home cooking aesthetic",
    promptExtra: "IMPORTANTE: Cucina spagnola autentica. NON è cucina italiana. La paella ha lo zafferano vero. La tortilla è con patate e uova, non una frittata italiana. Rispetta le differenze culturali.",
  },
  "Grecia": {
    identity: "Cucina greca: mediterranea, yogurt, olio extravergine, erbe aromatiche, piatti dal forno o freschi.",
    dishes: "Moussaka, Tzatziki, Souvlaki, Insalata greca, Spanakopita, Fasolada, Dolmades, Taramasalata",
    rules: [
      "Ingredienti semplici e genuini",
      "Molto olio extravergine greco",
      "Presentazione autentica e rustica",
      "Non italianizzare: origano greco, feta vera, olive kalamata",
      "Cucina mediterranea semplice e saporita",
    ],
    imageStyle: "white and blue Mediterranean tones, bright natural daylight, simple ceramic plate on white or wooden table, fresh herbs visible, clean airy atmosphere, no hands, authentic Greek presentation",
    promptExtra: "IMPORTANTE: Cucina greca autentica. Usa origano greco, feta, olive kalamata, olio extravergine greco. Il piatto deve sembrare uscito da una taverna greca o da una cucina casalinga greca — non da un ristorante 'mediterraneo generico'.",
  },
  "Stati Uniti": {
    identity: "Comfort food americano: versione casalinga e autentica. Porzioni generose, ricette iconiche. NON fast food industriale.",
    dishes: "Cheesecake New York, Pancakes, BBQ Ribs, Burger, Mac & Cheese, Brownies, Clam Chowder, Apple Pie",
    rules: [
      "Versione casalinga autentica, NON fast food industriale",
      "Ridurre eccessi di grassi inutili rispetto alla versione commerciale",
      "Ingredienti reperibili in Italia (con sostituzioni quando necessario)",
      "Evitare estetica da fast food",
      "Rispettare l'identità di comfort food americano vero",
    ],
    imageStyle: "warm cozy American kitchen atmosphere, rustic wooden table, simple honest plating, warm natural light, no hands, no fast food advertising aesthetic, no Instagram-filter excess, authentic homemade American feel",
    promptExtra: "IMPORTANTE: Comfort food americano casalingo autentico. NON è fast food. È la cucina della nonna americana: honest, generous, real. Adatta gli ingredienti quando necessario per l'Italia (es: heavy cream → panna fresca, buttermilk → latte con limone).",
  },
};

const EXTRA_OCCASIONS = [
  "Friggitrice ad Aria", "Diabetici", "Nutrizionista", "Dolci Fitness",
  "Veloci 20min", "Cene Leggere", "Fitness Pratiche", "Pani e Dolci",
  "Piano 35 Giorni", "Collezione Cucina", "Collezione Instagram",
  "Pasti Congelati", "Pane Fatto in Casa",
];

export default function AdminRecipeGenerator() {
  const [occasions, setOccasions] = useState([]);
  const [loadingOcc, setLoadingOcc] = useState(true);
  const [selectedOcc, setSelectedOcc] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [existingTitles, setExistingTitles] = useState([]);

  // params
  const [difficulty, setDifficulty] = useState("Facile");
  const [maxTime, setMaxTime] = useState(30);
  const [servings, setServings] = useState(4);
  const [extraNote, setExtraNote] = useState("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const isInternational = selectedOcc?.label?.toLowerCase().includes("cucina internazionale") || selectedOcc?.label?.toLowerCase().includes("dal mondo");

  // generated
  const [recipe, setRecipe] = useState(null);
  const [recipeOcc, setRecipeOcc] = useState(null); // snapshot of occ at generation time
  const [recipeCountry, setRecipeCountry] = useState(null); // snapshot of country at generation time
  const [editedCalories, setEditedCalories] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.RecipeOccasion.filter({ is_active: true }, "sort_order", 50)
      .then(setOccasions).finally(() => setLoadingOcc(false));
    // Load prompt master from AppConfig
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

  const grouped = {
    giorno: occasions.filter(o => o.tipo === "giorno"),
    speciale: occasions.filter((o, i, arr) => o.tipo === "speciale" && arr.findIndex(x => x.label === o.label && x.tipo === "speciale") === i),
    stile_vita: occasions.filter((o, i, arr) => o.tipo === "stile_vita" && arr.findIndex(x => x.label === o.label && x.tipo === "stile_vita") === i),
  };

  const buildRecipePrompt = (occ, country = null) => {
    const guidelines = occ.linee_guida?.join("\n- ") || "";
    const label = occ.label?.toLowerCase() || "";
    const isPranzo = occ.categoria_principale === "pranzo" || label.includes("pranzo");
    const isCena = occ.categoria_principale === "cena" || label.includes("cena");
    const isNatale = label.includes("natale");
    const isCapodanno = label.includes("capodanno");

    // Country-specific block for Cucina Internazionale
    const profile = country ? countryProfiles[country] : null;
    const countryBlock = profile ? `
=== CUCINA INTERNAZIONALE: ${country.toUpperCase()} ===
Identità culinaria: ${profile.identity}

Piatti tipici da cui ispirarsi: ${profile.dishes}

Regole specifiche:
- ${profile.rules.join("\n- ")}

${profile.promptExtra}

REGOLE UNIVERSALI CUCINA INTERNAZIONALE:
- Ricetta autentica del paese indicato — NON una reinterpretazione italiana
- Ingredienti reperibili in Italia (con alternative pratiche se necessario)
- Nessuna contaminazione o fusion non richiesta
- Presentazione realistica e autentica
- No estetica influencer, no effetti artificiali, no mani, no ingredienti sospesi
=== FINE SEZIONE PAESE ===
` : "";

    const pranzoExtra = isPranzo && !isNatale ? `
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

    const isVeloci = label.includes("veloci");
    const velociExtra = isVeloci ? `
REGOLE SPECIFICHE PER RICETTE VELOCI ITALIANE:
- Può includere: pasta veloce, insalate, frittate, zuppe rapide, MA ANCHE:
  * Panino italiano (ciabatta, rosetta, focaccia, baguette italiana) con massimo 4-5 ingredienti di qualità
  * Tramezzino (pane morbido senza crosta, taglio triangolare, recheio clássico: tonno e maionese, prosciutto e formaggio, uova)
  * Piadina (pane sottile della Romagna, recheio: prosciutto crudo + squacquerone + rúcula, oppure speck + stracchino)
- Per panini e piadine: MASSIMO 4-5 ingredienti, qualità > quantità
- Niente ingredienti industriali o ultra-processati
- Visual italiano autentico: pulito, ordinato, artigianale
- NON fare: panini americani stile fast food, burger eccessivi, wrap generici
- I nomi devono essere italiani: "Panino Gourmet", "Piadina Rustica", "Tramezzino Classico", ecc.
` : "";

    const cenaExtra = isCena && !isCapodanno ? `
REGOLE SPECIFICHE PER CENA ITALIANA:
- La cena deve essere più leggera rispetto al pranzo: NO lasagne pesanti, NO fritti, NO piatti eccessivamente grassi
- Preferire: verdure, proteine leggere (pesce, uova, pollo), zuppe, minestre, frittate
- Preparazione: al massimo ${maxTime} minuti (rispetta questo tempo)
- Porzione moderata: l'italiano non vuole appesantirsi la sera
- Piatto digeribile: cultura italiana di "non appesantirsi la sera" è fondamentale
- Ingredienti stagionali e facilmente reperibili in un supermercato italiano
- Presentazione elegante ma naturale, non esagerata
- Atmosfera: rilassante, serale, intima
- Esempi validi: frittata con verdure, pesce al forno, insalata con tonno, minestrone, zuppa leggera, pollo al limone
` : "";

    const nataleExtra = isNatale ? `
REGOLE CRITICHE PER NATALE - PRANZO TRADIZIONALE:
- Ricetta DEVE ESSERE tradizionale italiana, riconoscibile e autentica
- Niente reinterpretazioni moderne, niente fusion, niente esperimenti creativi
- Piatti tipici di Natale: tortellini in brodo, lasagne, arrosto, capone ripieno, panettone, pandoro
- Porzione generosa: è il pranzo di festa per la famiglia
- Struttura: Antipasti → Primo → Secondo → Contorni → Dolce
- Ingredienti classici e facilmente reperibili in Italia
- Presentazione rustica elegante, piatto generoso ma ordinato
- L'obiettivo: "Voglio ricordare il Natale di mia nonna"
- Difficoltà media-alta: la ricetta può richiedere tempo e abilità
` : "";

    const capodannoExtra = isCapodanno ? `
REGOLE CRITICHE PER CAPODANNO - CENA ELEGANTE:
- Ricetta deve celebrare l'inizio di un nuovo anno con eleganza e tradizione
- Preferibilmente includi LENTICCHIE (simbolo di prosperità e soldi per l'anno nuovo)
- O cotechino con lenticchie (piatto classico di Capodanno italiano)
- Ingredienti eleganti e di qualità: spumante, ingredienti premium quando possibile
- Presentazione raffinata ma autentica: NON eccessivamente moderna
- Atmosfera: festiva, elegante, celebratoria
- Piatto che dice "Auguriamo prosperità e felicità nel nuovo anno"
- Ingredienti: facili da reperire in Italia, di qualità
` : "";

    const titlesBlock = existingTitles.length > 0
      ? `\nRICETTE GIÀ ESISTENTI (NON RIPETERE MAI QUESTI TITOLI, NÉ VARIANTI SIMILI — neanche piatti con lo stesso nome principale cambiando solo la variante o il condimento):\n${existingTitles.map(t => `- ${t}`).join("\n")}\n\nSe tendi a ripetere piatti come pasta/risotto/pollo, scegli qualcosa di diverso questa volta.\n`
      : "";

    const isIntl = label.includes("cucina internazionale");

    return `Sei uno chef esperto di cucina ${isIntl && profile ? profile.identity.split(":")[0] : "italiana"}.

Crea una ricetta ${isIntl && country ? `autentica di cucina ${country}` : "autentica italiana"} per questa occasione.
${titlesBlock}
${extraNote ? `\n🚨 VINCOLO ASSOLUTO — LEGGI PRIMA DI TUTTO:\nL'utente ha richiesto ESATTAMENTE: "${extraNote}"\nDevi creare LA RICETTA CHE L'UTENTE HA CHIESTO. Non ignorare questa richiesta. Non interpretarla liberamente. Non sostituirla con qualcosa di simile. Se ha scritto un nome di piatto, quello è il titolo della ricetta. Se ha indicato un ingrediente, deve essere protagonista. Se ha indicato una restrizione (es: senza carne), rispettala al 100%. Questo vincolo SOVRASCRIVE qualsiasi altra regola di questa sezione.\n` : ""}
Occasione: ${occ.label}${country ? ` — Paese: ${country}` : ""}
Mood: ${occ.mood || ""}
Categoria principale: ${occ.categoria_principale || "all"}
Stagione: ${occ.stagione || "all"}
Difficoltà: ${difficulty}
Tempo di preparazione: ESATTAMENTE circa ${maxTime} minuti (rispetta questo tempo — non ridurlo, non ignorarlo)
Porzioni: ${servings}

${countryBlock}
${!isIntl ? `Linee guida:\n- ${guidelines}` : ""}
${pranzoExtra}${cenaExtra}${velociExtra}${nataleExtra}${capodannoExtra}
${occ.prompt_extra ? `\n${occ.prompt_extra}` : ""}

═══════════════════════════════════════
REGOLE OBBLIGATORIE PER LA RICETTA — NON DEROGABILI
═══════════════════════════════════════
La ricetta deve essere una vera preparazione culinaria.
È VIETATO generare semplici assemblaggi di ingredienti.

La ricetta deve includere OBBLIGATORIAMENTE:
1. Una fase di preparazione (mescolare, impastare, tagliare, marinare, ecc.)
2. Una fase di cottura reale (forno, padella, bollitura, frittura, tostatura, ecc.)

Il procedimento deve spiegare chiaramente i passaggi di cucina.
NON generare ricette che consistono solo nel servire ingredienti già pronti.
═══════════════════════════════════════

La ricetta deve essere autentica, realistica e coerente con l'occasione.
IMPORTANTE: La ricetta generata deve essere COMPLETAMENTE DIVERSA da tutte quelle nell'elenco sopra — non solo nel nome, ma nel tipo di piatto, negli ingredienti principali e nella tecnica di cottura. Se l'elenco ha già molte paste, fai qualcosa di diverso. Se ha già molto pollo, evitalo. Sii creativo e varia.

═══════════════════════════════════════
CALCOLO CALORIE OBBLIGATORIO — NON DEROGABILE
═══════════════════════════════════════
Devi calcolare le calorie per OGNI ingrediente usando valori medi reali, sommarlo e dividere per le porzioni.
Valori di riferimento OBBLIGATORI:
- Uova: 70 kcal per uovo
- Olio extravergine di oliva: 9 kcal per grammo (≈ 90 kcal per 10ml / ≈ 135 kcal per 15ml)
- Burro: 720 kcal per 100g
- Farina 00: 360 kcal per 100g
- Zucchero: 400 kcal per 100g
- Latte intero: 64 kcal per 100ml
- Panna: 300 kcal per 100ml
- Prosciutto crudo: 250 kcal per 100g
- Formaggi stagionati (parmigiano, pecorino): 380 kcal per 100g
- Mozzarella: 250 kcal per 100g
- Pasta/riso crudi: 350 kcal per 100g
- Pane: 250 kcal per 100g
- Carne (pollo, manzo): 150–200 kcal per 100g
- Pesce: 100–180 kcal per 100g
- Verdure: 20–50 kcal per 100g
REGOLE:
1. NON ignorare l'olio, il burro o i formaggi nel calcolo.
2. NON usare stime generiche o valori medi del piatto.
3. Se il totale appare troppo basso per un piatto principale (< 300 kcal a porzione), RICALCOLARE.
4. Somma ingrediente per ingrediente, poi dividi per ${servings} porzioni.
═══════════════════════════════════════

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
  "paese": "${country || ""}",
  "dietary_tags": [],
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
Difficoltà valide: Facile, Media, Difficile.

═══════════════════════════════════════
ANALISI AUTOMATICA DIETARY_TAGS — OBBLIGATORIA
═══════════════════════════════════════
Analizza gli ingredienti e i macros della ricetta e popola il campo "dietary_tags" con tutte le tag applicabili tra queste (array di stringhe):
["Senza glutine", "Senza lattosio", "Senza zucchero", "Vegano", "Vegetariano", "Low carb", "Alto contenuto proteico", "Diabetico", "Detox", "Fit", "Senza uova", "Senza frutti di mare"]

Regole per applicare ogni tag:
- "Senza glutine" → nessun ingrediente contiene frumento, segale, orzo, avena, farina di frumento, pane normale, pasta normale
- "Senza lattosio" → nessun ingrediente contiene latte, formaggio, burro, panna, yogurt, mozzarella, ricotta, mascarpone, parmigiano, latticini
- "Senza zucchero" → nessun ingrediente contiene zucchero, miele, sciroppo, frutta secca zuccherata in quantità
- "Vegano" → nessun prodotto animale: niente carne, pesce, uova, latticini, miele
- "Vegetariano" → niente carne né pesce (ma può avere uova e latticini)
- "Low carb" → carboidrati < 20g per porzione
- "Alto contenuto proteico" → proteine > 20g per porzione
- "Diabetico" → zuccheri < 10g E carboidrati < 30g per porzione, senza zucchero raffinato
- "Detox" → ricetta basata principalmente su verdure fresche, frutta, erbe, senza ingredienti processati
- "Fit" → calorie < 400 per porzione E bilanciata nei macros
- "Senza uova" → nessun ingrediente contiene uova
- "Senza frutti di mare" → nessun ingrediente contiene gamberi, cozze, vongole, calamari, polpo, frutti di mare, crostacei
Applica TUTTE le tag che si applicano correttamente. Lascia array vuoto [] se nessuna si applica.
═══════════════════════════════════════

REGOLA CRITICA INGREDIENTI — NOMI ITALIANI CORRETTI:
- TUTTI gli ingredienti DEVONO avere nomi italiani corretti e reali.
- NO parole di senso (tipo "respiro", "osso", "alto", "fibra") — questi sono errori di traduzione/generazione automatica.
- NO nomi vuoti, NO nomi generici come "ingrediente", NO parole strane.
- Esempi CORRETTI: "pomodori", "aglio", "cipolla", "pasta", "riso", "olio extravergine", "sale", "pepe", "mozzarella", "pollo", "salmone".
- Esempi SBAGLIATI: "respiro", "osso", "alto", "fibra", "farina 00" (scritto male — DEVE essere "farina 00" ma niente errori).
- Se un ingrediente ha un nome dubbio o non è reale, sostituiscilo con il nome STANDARD italiano più vicino.`;
  };

  const buildImagePrompt = (occ, recipe, country = null) => {
    if (!recipe) return "";
    
    const title = recipe.title;
    const label = occ.label?.toLowerCase() || "";
    const isPranzo = occ.categoria_principale === "pranzo" || label.includes("pranzo");
    const isCena = occ.categoria_principale === "cena" || label.includes("cena");
    const isNatale = label.includes("natale");
    const isCapodanno = label.includes("capodanno");
    const isIntl = label.includes("cucina internazionale");
    const countryProfile = country ? countryProfiles[country] : null;

    // Extract main ingredients for visual hints
    const mainIngredients = recipe.ingredients?.slice(0, 4).map(i => i.name).join(", ") || "";

    // Infer visual characteristics from description and ingredients
    const descLower = recipe.description?.toLowerCase() || "";
    const ingredLower = mainIngredients.toLowerCase();
    
    let colorHints = "";
    let textureHints = "";
    
    // Color detection
    if (ingredLower.includes("pomodoro") || ingredLower.includes("rosso")) colorHints = "vibrant red tones,";
    else if (ingredLower.includes("verdura") || ingredLower.includes("verde")) colorHints = "fresh green hues,";
    else if (ingredLower.includes("burro") || ingredLower.includes("panna")) colorHints = "creamy beige and golden tones,";
    else if (ingredLower.includes("olio") || ingredLower.includes("olive")) colorHints = "golden olive green accents,";
    else if (ingredLower.includes("carne")) colorHints = "warm brown and caramel tones,";
    else colorHints = "warm natural Italian colors,";

    // Texture detection
    if (descLower.includes("cremoso") || ingredLower.includes("panna")) textureHints = "creamy smooth texture,";
    else if (descLower.includes("croccante") || descLower.includes("fritta")) textureHints = "crispy golden exterior,";
    else if (descLower.includes("morbido") || descLower.includes("soffice")) textureHints = "soft fluffy texture,";
    else if (descLower.includes("al dente") || ingredLower.includes("pasta")) textureHints = "perfectly cooked pasta with defined edges,";
    else textureHints = "inviting appetizing texture,";

    const nataleVisual = isNatale
      ? `large serving dish or baking pan, festive white tablecloth, warm golden indoor light, family atmosphere with softly blurred background, generous authentic presentation, rustic elegant,`
      : ``;

    const capodannoVisual = isCapodanno
      ? `elegant white ceramic plate, refined Italian festive table, soft warm candlelight, wine or spumante glass nearby discretely, shallow depth of field, sophisticated but natural,`
      : ``;

    const pranzoVisual = isPranzo && !isNatale
      ? `rustic wooden table, white ceramic plate, natural daylight from window, simple napkin beside plate, authentic Italian home lunch setting, warm natural colors, slightly blurred background, realistic and inviting,`
      : ``;

    const cenaVisual = isCena && !isCapodanno
      ? `simple wooden table, white ceramic plate, warm indoor evening light, cozy home atmosphere softly blurred, relaxing dinner setting, natural authentic presentation,`
      : ``;

    // Use country-specific image style if international
    if (isIntl && countryProfile) {
      const base = `Professional realistic food photography of ${title},`;
      const ingredients = mainIngredients ? `featuring ${mainIngredients},` : "";
      const fixedIntl = `no steam, no floating ingredients, no dramatic splash, no human presence, no hands, no over styling, no unrealistic effects, clean simple composition, high resolution, CRITICAL: NO visible labels, NO readable text on bottles or packaging, NO branded products, all containers plain unlabeled or blurred`;
      return `${base} ${ingredients} ${colorHints} ${textureHints} ${countryProfile.imageStyle}, ${fixedIntl}.`;
    }

    const isSandwich = title.toLowerCase().includes("panino") || title.toLowerCase().includes("piadina") || title.toLowerCase().includes("tramezzino");
    const sandwichVisual = isSandwich
      ? `All fillings must stay mostly INSIDE the bread. No oversized leaves sticking out. No ingredients falling or floating outside. No messy American fast food aesthetic. Clean Italian artisanal presentation. Compact structure, realistic proportions. Ingredients neatly layered and properly cut. No molten sauce dripping excessively.`
      : ``;

    // Pasta/sauce detection
    const pastaKeywords = ["pasta", "spaghetti", "tagliatelle", "penne", "rigatoni", "fusilli", "linguine", "fettuccine", "lasagne", "gnocchi", "trofie", "orecchiette", "bucatini", "maccheroni", "macarrão", "carbonara", "amatriciana", "arrabbiata", "bolognese", "ragù", "pesto", "cacio e pepe", "gricia", "vongole", "norma", "all'uovo", "pomodoro", "matriciana"];
    const titleLower = title.toLowerCase();
    const isPasta = pastaKeywords.some(k => titleLower.includes(k)) || (recipe.ingredients || []).some(i => pastaKeywords.some(k => i.name?.toLowerCase().includes(k)));
    const pastaVisual = isPasta
      ? `CRITICAL PASTA RULE: The pasta MUST be completely coated and enveloped in the sauce — never dry, never with sauce sitting separately on top. The sauce is structural, not decorative. The dish must look like it was just finished "saltato in padella" (tossed in the pan). Pasta should appear slightly glistening and moist. No white dry pasta visible. No sauce pooled only at the bottom. No ingredients floating randomly. Sauce fully integrated with pasta. Realistic Italian home cooking proportions — not excessive sauce, not too little. Authentic texture: creamy sauces look silky and light (not heavy American cream sauce), tomato sauces look rich and naturally red (not neon), meat ragù looks dense and mixed throughout.`
      : ``;

    // Fish detection — filetti vs pesce intero vs frutti di mare + metodo cottura
    const fishKeywords = ["pesce", "orata", "branzino", "salmone", "tonno", "baccalà", "spigola", "merluzzo", "trota", "sgombro", "sardin", "alici", "calamari", "gamberi", "polpo", "seppia", "rombo", "halibut", "sogliola", "fish", "cozze", "vongole", "frutti di mare", "spada"];
    const filletKeywords = ["filetti", "filetto", "trancio", "tranci", "fillet"];
    const wholeKeywords = ["intero", "intera", "al forno intero", "pesce al forno", "pesce intero"];
    const saltCrustKeywords = ["crosta di sale", "sale grosso", "sale compatto", "in crosta"];
    const searedKeywords = ["alla griglia", "griglia", "grigliata", "grigliato", "alla brace"];
    const friedKeywords = ["fritto", "fritta", "fritti", "friggere", "frittura"];
    const acquaPazzaKeywords = ["acqua pazza", "umido", "brodoso"];
    const seafoodKeywords = ["cozze", "vongole", "gamberi", "polpo", "calamari", "frutti di mare", "seppia"];
    const rawKeywords = ["carpaccio", "crudo", "tartare", "marinato a crudo"];

    const allText = (titleLower + " " + ingredLower + " " + (recipe.instructions || []).join(" ").toLowerCase());
    const hasFish = fishKeywords.some(k => allText.includes(k));
    const hasFillets = filletKeywords.some(k => allText.includes(k));
    const hasWhole = wholeKeywords.some(k => allText.includes(k));
    const hasSaltCrust = saltCrustKeywords.some(k => allText.includes(k));
    const hasSeared = searedKeywords.some(k => allText.includes(k));
    const hasFried = friedKeywords.some(k => allText.includes(k));
    const hasAcquaPazza = acquaPazzaKeywords.some(k => allText.includes(k));
    const hasSeafood = seafoodKeywords.some(k => allText.includes(k));
    const hasRaw = rawKeywords.some(k => allText.includes(k));

    let fishVisual = "";
    if (hasFish) {
      // --- COOKING METHOD block ---
      let cookingMethod = "";
      if (hasSaltCrust) {
        cookingMethod = `COTTURA IN CROSTA DI SALE: Il pesce è COMPLETAMENTE sepolto e NON visibile sotto una crosta di sale BIANCA, SOLIDA e COMPATTA come gesso. La crosta è INTATTA — non rotta, non granulare, non spolverata. Erbe aromatiche spuntano dai bordi. Teglia da forno scura e robusta. Il pesce NON si vede. VIETATO: sale granulare sparso sopra il pesce, pesce già aperto. `;
      } else if (hasSeared) {
        cookingMethod = `COTTURA ALLA GRIGLIA: Striature di griglia visibili e ben definite sulla pelle del pesce. Pelle croccante e dorata, non bruciata né pallida. Servito con spicchi di limone e un filo d'olio extravergine visibile. Piatto semplice, luce naturale laterale. `;
      } else if (hasFried) {
        cookingMethod = `PESCE FRITTO: Doratura uniforme e croccante su tutta la superficie. Aspetto asciutto e croccante (mai unto o molliccio). Servito su carta assorbente o piatto bianco semplice con spicchi di limone. `;
      } else if (hasAcquaPazza) {
        cookingMethod = `PESCE IN UMIDO / ACQUA PAZZA: Pesce immerso in un sugo leggero di pomodoro rosso chiaro, brodoso e non denso. Colore rosso tenue con il pesce bianco visibile dentro. Sugo con pomodorini, aglio, prezzemolo. Piatto fondo in ceramica rustica italiana. `;
      } else {
        cookingMethod = `PESCE AL FORNO: Pesce in teglia da forno rustica, dorato fuori, umido e bianco dentro (mai secco). Pomodorini, olive, capperi o erbe visibili attorno. Olio extravergine visibile. `;
      }

      // --- SHAPE block (whole vs fillet vs seafood vs raw) ---
      if (hasSeafood && !hasFillets && !hasWhole) {
        fishVisual = `CRITICAL FISH RULE — FRUTTI DI MARE: Mostrare chiaramente i frutti di mare (cozze aperte, gamberi interi o sgusciati, polpo a tentacoli, calamari ad anelli o interi). Nessun pesce intero con testa. Presentazione italiana autentica: terracotta o piatto bianco semplice, sugo di pomodoro leggero se presente, prezzemolo fresco visibile, pane rustico a lato. Luce naturale, atmosfera trattoria di mare. ${cookingMethod}`;
      } else if (hasRaw) {
        fishVisual = `CRITICAL FISH RULE — CRUDO/CARPACCIO: Fettine sottilissime di pesce disposte ordinatamente (salmone rosa chiaro o spada bianco perla). Condimento minimalista: olio, sale, limone (solo come gocce, non spicchi interi). Piatto bianco grande, luce naturale brillante, composizione pulita ed elegante. Nessun pesce intero, nessuna cottura visibile. ${cookingMethod}`;
      } else if (hasFillets && !hasWhole) {
        fishVisual = `CRITICAL FISH RULE — FILETTI: Mostrare 2 o 4 filetti di pesce chiaramente separati, piatti, senza testa né lisca centrale. Bordi leggermente dorati, interno umido e bianco. VIETATO mostrare pesce intero con testa e coda. Stile mediterraneo: olio d'oliva visibile, erbe fresche (prezzemolo, timo, rosmarino), verdure arrosto attorno se presenti nella ricetta. Piatto ceramica bianca ovale o teglia rustica, luce naturale laterale. ${cookingMethod}`;
      } else if (hasWhole && !hasFillets) {
        fishVisual = `CRITICAL FISH RULE — PESCE INTERO: Mostrare pesce intero con testa e coda visibili, pelle INTEGRA e non rotta. Occhio bianco (pesce cotto). Erbe aromatiche sopra e ai lati, spicchi di limone accanto. VIETATO: pelle bruciata nera, pesce aperto o sfilettato in teglia. Teglia da forno rettangolare scura o terracotta, olio extravergine visibile. Luce naturale laterale, stile trattoria italiana di mare. ${cookingMethod}`;
      } else {
        // Default: filetti (most common for quick recipes)
        fishVisual = `CRITICAL FISH RULE: Mostrare pezzi di pesce cotti (filetti o tranci), NON pesce intero con testa e coda a meno che la ricetta non lo specifichi esplicitamente. Pesce umido e fresco dentro, leggermente dorato fuori. Piatto ceramica semplice, luce naturale, erbe fresche, stile trattoria italiana di mare. ${cookingMethod}`;
      }

      // Universal fish rules appended to all cases
      fishVisual += ` REGOLE UNIVERSALI PESCE: Il pesce deve sembrare APPENA CUCINATO, umido e fresco dentro. Stile fotografico trattoria italiana reale. Ingredienti visibili SOLO se presenti nella ricetta. VIETATO: stile fine dining con decorazioni elaborate, sfondi scuri artificiali, presentazione americana fast food, aggiungere ingredienti non presenti nella ricetta.`;
    }

    // Peperonata detection
    const hasPeperonata = allText.includes("peperonata");
    const peperonataVisual = hasPeperonata
      ? `CRITICAL PEPERONATA RULE: The peperonata MUST show clearly distinct and visible chunky pieces of YELLOW bell peppers, RED bell peppers AND tomato chunks — the tomatoes must appear as recognizable pieces, NOT dissolved or invisible in the sauce. Peppers should be sliced in strips, soft and caramelized. The dish must look like a colorful mix of yellow, red and orange-red tomato pieces clearly identifiable. No mushy or monochrome sauce appearance. Grill marks must be visible on the chicken if present alongside.`
      : ``;

    const base = `Professional realistic food photography of ${title}, Italian ${occ.categoria_principale || "food"},`;
    const ingredients = mainIngredients ? `featuring ${mainIngredients},` : "";
    const modifiers = occ.image_modifiers?.join(", ") || "";
    // Lemon rule: only show lemon if explicitly protagonist in title/instructions
    const allTextLower = (titleLower + " " + (recipe.description || "").toLowerCase() + " " + (recipe.instructions || []).join(" ").toLowerCase());
    const lemonIsProtagonist = ["fette di limone", "decorazione con limone", "limone protagonista", "al limone e", "con limone"].some(k => allTextLower.includes(k)) && ["succo di limone", "aroma", "scorza"].every(k => !allTextLower.includes(k));
    const lemonRule = lemonIsProtagonist
      ? `lemon slices may appear subtly as garnish,`
      : `CRITICAL: DO NOT show lemon slices, lemon wedges, or decorative lemon pieces. If lemon is used it is only for flavor/aroma — it must NOT appear visually in the dish or as decoration. No lemon at all, or at most a barely visible subtle hint in the background.`;

    const fixed = `no steam, no floating ingredients, no dramatic splash, no human presence, no hands, no over styling, no unrealistic effects, clean simple composition, high resolution, CRITICAL: NO visible labels, NO readable text on bottles or packaging, NO branded products, NO olive oil bottles with labels, all containers must be plain unlabeled or blurred, artisanal Italian kitchen aesthetic`;
    
    return `${base} ${ingredients} ${colorHints} ${textureHints} ${nataleVisual}${capodannoVisual}${pranzoVisual}${cenaVisual} ${sandwichVisual} ${pastaVisual} ${fishVisual} ${peperonataVisual} ${lemonRule} ${modifiers}, ${fixed}.`;
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
    toast.success("Prompt salvato come default!");
  };

  const handleGenerate = async () => {
    if (!selectedOcc) return toast.error("Seleziona un'occasione prima");
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
          difficulty: { type: "string" },
          occasions: { type: "array", items: { type: "string" } },
          paese: { type: "string" },
          dietary_tags: { type: "array", items: { type: "string" } },
          ingredients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "string" }, category: { type: "string" } } } },
          instructions: { type: "array", items: { type: "string" } },
        },
      },
    });
    // Force prep_time to match the user's selected value — the LLM often ignores it
    const normalizedResult = result ? { ...result, prep_time: maxTime } : result;
    // Sanitize ingredient names
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
    toast.success("Ricetta generata! Controlla e poi genera l'immagine.");
  };

  const handleGenerateImage = async () => {
    if (!recipe) return;
    setGeneratingImage(true);
    const imgPrompt = buildImagePrompt(recipeOcc || selectedOcc, recipe, recipeCountry || selectedCountry);
    const result = await base44.integrations.Core.GenerateImage({ prompt: imgPrompt });
    setImageUrl(result.url);
    setGeneratingImage(false);
    toast.success("Immagine generata!");
  };

  const handleSave = async () => {
    if (!recipe) return;
    if (isInternational && !selectedCountry) {
      return toast.error("Seleziona il paese per Cucina Internazionale");
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
        dietary_tags: recipe.dietary_tags || [],
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        calories: editedCalories ? Number(editedCalories) : recipe.calories,
        image_url: imageUrl || "",
        status: "pubblicata",
        numero_salvate: 0,
        numero_preparate: 0,
        ...(isInternational && selectedCountry ? { paese: selectedCountry } : {}),
      };
      await base44.entities.Recipe.create(data);
      toast.success("Ricetta pubblicata!");
      setRecipe(null);
      setImageUrl("");
      setExtraNote("");
      setSelectedCountry(null);
    } catch (err) {
      toast.error("Errore nel salvataggio: " + (err?.message || "riprova"));
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
          <p className="text-sm font-bold text-amber-800">🧠 Prompt Mestre (opzionale)</p>
          <button
            onClick={savePromptMaster}
            disabled={savingPrompt}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
          >
            {savingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookmarkCheck className="w-3 h-3" />}
            Salva come default
          </button>
        </div>
        <textarea
          value={masterPrompt}
          onChange={e => setMasterPrompt(e.target.value)}
          placeholder="Incolla qui il tuo prompt master con tutte le istruzioni di stile e formato..."
          rows={4}
          className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200 bg-white focus:outline-none resize-none"
        />
        <p className="text-[10px] text-amber-600">Quando compilato, viene iniettato come istruzione principale prima di ogni generazione.</p>
      </div>
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
        {/* Prodotti GP — hardcoded */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📦 Prodotti e Collezioni GP</p>
          <div className="flex flex-wrap gap-2">
            {EXTRA_OCCASIONS.map(label => {
              const syntheticId = `extra_${label}`;
              const isActive = selectedOcc?.id === syntheticId;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedOcc({ id: syntheticId, label, tipo: "speciale", icon: "📦", linee_guida: [], mood: "", categoria_principale: "all", stagione: "all" })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isActive
                      ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                      : "bg-gray-50 text-gray-600 border-gray-100 hover:border-[#2D6A4F]/30"
                  }`}
                >
                  📦 {label}
                </button>
              );
            })}
          </div>
        </div>
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

      {/* Country selector for Cucina Internazionale */}
      {isInternational && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
          <p className="text-sm font-bold text-gray-800">Seleziona il paese</p>
          <div className="grid grid-cols-2 gap-2">
            {countries.map(country => (
              <button
                key={country.label}
                onClick={() => setSelectedCountry(country.label)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  selectedCountry === country.label
                    ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                    : "bg-gray-50 text-gray-600 border-gray-100 hover:border-[#2D6A4F]/30"
                }`}
              >
                {country.flag} {country.label}
              </button>
            ))}
          </div>
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
            placeholder="Es: 'Pasta al Ragù di Manzo' (nome esatto), 'senza glutine', 'usa melanzane', 'piatto tipico siciliano', 'con salmone e limone'..."
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
              <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg font-semibold">
                <input
                  type="number"
                  value={editedCalories}
                  onChange={e => setEditedCalories(e.target.value)}
                  className="w-14 bg-transparent text-orange-700 font-semibold outline-none text-xs"
                />
                kcal
              </span>
            </div>
          </div>

          {recipe.dietary_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.dietary_tags.map(tag => (
                <span key={tag} className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}

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
                <p key={i} className="text-xs text-gray-500">{i + 1}. {step.replace(/^\d+\.\s*/, "")}</p>
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