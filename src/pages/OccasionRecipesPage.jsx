import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Search, Heart, Star, Loader2, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { premiumPitch } from "@/components/PremiumBanner";
import { trackEvent } from "@/components/useAnalytics";




const OCCASION_ICONS = {
  "Fit": "🏋️", "Detox": "🌿", "Low carb": "🥗", "Low Carb": "🥗",
  "Colazione": "☕", "Pranzo": "🍝", "Cena": "🌙", "Estate": "☀️",
  "Primavera": "🌸", "Dolce": "🍮", "Dolci": "🍮", "Snack": "🍎",
  "Bevanda": "🥤", "Proteiche": "💪", "Diabete": "🩺",
  "Senza zucchero": "🚫🍬", "Veloci": "⚡", "In famiglia": "👨‍👩‍👧",
  "Con amici": "🎉", "Dal mondo": "🌍", "Leggera": "🥙",
  "Instagram": "📸", "Inverno": "❄️", "Autunno": "🍂",
  "Per due": "💑", "Natale e Capodanno": "🎄",
};

const DAILY_OCCASIONS = ["Colazione", "Pranzo", "Cena"];
const CATEGORY_PILLS = ["Tutte", "Colazione", "Pranzo", "Cena", "Snack", "Dolce", "Bevanda"];
// Filtro especial "Fitness" — só aparece nelle occasioni che contengono ricette fit
// (es: Collezione Gosto Puro). Filtra per tag Fit/Fitness invece che per category.
const FITNESS_PILL = "💪 Fitness";

// Filtri tematici dedicati alla pagina "Gelati Artigianali" (invece di Colazione/Pranzo/…).
// Filtrano per tag secondaria nelle occasions (es. "Gelati Classici"), non per category.
const GELATI_THEME_PILLS = [
  { label: "🍦 Classici", tag: "Gelati Classici" },
  { label: "✨ Innovativi", tag: "Gelati Innovativi" },
  { label: "🌿 Sani", tag: "Gelati Sani" },
  { label: "🌱 Vegani", tag: "Gelati Vegani" },
  { label: "🍫 Coperture", tag: "Gelati Coperture" },
  { label: "💡 Consigli", tag: "Gelati Consigli" },
];
const GELATI_EXTRA_TAGS = ["Gelati Coperture", "Gelati Consigli"];

// Filtri tematici della pagina "Pane Senza Glutine".
const PANE_THEME_PILLS = [
  { label: "🍞 Tradizionale", tag: "Pane Tradizionale" },
  { label: "🍞 In cassetta", tag: "Pane in Cassetta" },
  { label: "🌾 Integrale", tag: "Pane Integrale" },
  { label: "🥪 Panini morbidi", tag: "Panini Morbidi" },
  { label: "☕ Colazione", tag: "Pane Colazione" },
  { label: "✨ Speciali", tag: "Pani Speciali" },
  { label: "🥣 Impasti", tag: "Impasti Varianti" },
  { label: "🍕 Pizze", tag: "Pane Pizze" },
  { label: "🍰 Pizze dolci", tag: "Pane Pizze Dolci" },
  { label: "🎂 Torte", tag: "Pane Torte" },
  { label: "🍮 Dolci", tag: "Pane Dolci" },
  { label: "🥨 Snack", tag: "Pane Snack" },
  { label: "💡 Consigli", tag: "Pane Consigli" },
];
// "Tutte" mostra solo i pani veri: pizze, torte, dolci, snack e consigli hanno i loro filtri.
const PANE_EXTRA_TAGS = ["Pane Pizze", "Pane Pizze Dolci", "Pane Torte", "Pane Dolci", "Pane Snack", "Pane Consigli"];

// Filtri tematici della pagina "92 Ricette Deliziose per la Menopausa".
const MENOPAUSA_THEME_PILLS = [
  { label: "🥗 Insalate", tag: "Menopausa Insalate" },
  { label: "🍲 Pranzi e cene", tag: "Menopausa Pranzi Cene" },
  { label: "🥣 Zuppe leggere", tag: "Menopausa Zuppe" },
  { label: "🥑 Antinfiammatorie", tag: "Menopausa Antinfiammatorie" },
  { label: "🥤 Snack & smoothie", tag: "Menopausa Snack" },
  { label: "🍫 Dolci & colazioni", tag: "Menopausa Dolci" },
];

// Occasioni con filtri tematici propri (invece di Colazione/Pranzo/…).
const THEME_CONFIGS = [
  { occ: "Gelati Artigianali", pills: GELATI_THEME_PILLS, extra: GELATI_EXTRA_TAGS },
  { occ: "Pane Senza Glutine", pills: PANE_THEME_PILLS, extra: PANE_EXTRA_TAGS },
  { occ: "92 Ricette Deliziose per la Menopausa", pills: MENOPAUSA_THEME_PILLS, extra: [] },
].map((c) => ({ ...c, byLabel: Object.fromEntries(c.pills.map((t) => [t.label, t.tag])) }));

function activeTheme(occasion, terms) {
  return THEME_CONFIGS.find((c) =>
    occasion === c.occ || occasion.includes(c.occ) || (terms && terms.includes(c.occ))
  ) || null;
}

const PAGE_SIZE = 12;
// Max recipes to fetch in a single query — covers all known occasions
const FETCH_LIMIT = 3000;

// Occasione aliases para buscar receitas com labels antigos/novos
const occasionAliases = {
  "365 Ricette Deliziose per Diabetici": ["Diabete", "365 Ricette Deliziose per Diabetici"],
  "275 Ricette Fitness Pratiche ed Economiche": ["Fit", "275 Ricette Fitness Pratiche ed Economiche"],
};

// Receitas que pertencem a estas occasions devem ser EXCLUÍDAS de outras coleções (evita overlap)
const occasionExclusions = {
  "275 Ricette Fitness Pratiche ed Economiche": ["Friggitrice ad Aria"],
};

// Ocasiões GP produto: buscar SOMENTE em occasions (nunca em dietary_tags nem lifestyle)
// Impede que receitas com dietary_tag similar apareçam em coleções erradas
const GP_PRODUCT_OCCASIONS = new Set([
  "Senza zucchero", "Low carb", "Detox", "Fit",
  "Ricette Sane", "Veloci", "Friggitrice ad Aria", "Facili da Congelare",
  "Proteiche",
  "365 Ricette Deliziose per Diabetici",
  "275 Ricette Fitness Pratiche ed Economiche",
  "Cucina Senza Tempo",
]);

// Todas as ocasiões que compõem a "Collezione Gosto Puro"
const COLLEZIONE_GOSTO_PURO_OCCASIONS = [
  "Colazione", "Pranzo", "Cena", "Leggera",
  "Instagram", "In famiglia", "Per due", "Con amici",
  "Estate", "Autunno", "Inverno", "Primavera",
  "Natale e Capodanno",
];

const DIETARY_TAG_COLORS = {
  "Senza glutine": "bg-green-100 text-green-800",
  "Diabetico": "bg-orange-100 text-orange-800",
  "Low carb": "bg-blue-100 text-blue-800",
  "Alto contenuto proteico": "bg-blue-100 text-blue-800",
  "Vegano": "bg-lime-100 text-lime-800",
  "Vegetariano": "bg-lime-100 text-lime-800",
  "Senza lattosio": "bg-red-100 text-red-800",
  "Senza zucchero": "bg-red-100 text-red-800",
  "Detox": "bg-teal-100 text-teal-800",
  "Fit": "bg-teal-100 text-teal-800",
  "Senza uova": "bg-yellow-100 text-yellow-800",
  "Senza frutti di mare": "bg-purple-100 text-purple-800",
};

// Module-level cache so navigating back doesn't re-fetch.
// TTL curto (5 min) così le modifiche al catalogo (nuove ricette)
// appaiono senza dover chiudere/riaprire tutte le schede.
const recipesCache = {};
const recipesCacheTime = {};
const CACHE_TTL_MS = 5 * 60 * 1000;

// Link premium genérico (fallback enquanto não houver link de vendas dedicado).
const PREMIUM_LINK = "https://pay.hotmart.com/L104095305F?off=swawlhuf&checkoutMode=10";
// Link de vendas DEDICADO por ocasião bloqueada. Quando tiver o link real de cada
// produto, troque o PREMIUM_LINK pela URL específica daquela ocasião. Toda ocasião
// que estiver neste mapa mostra a tela de cadeado; sem link específico cai no premium.
// Detalhe de venda por coleção: título + descrição + bullets COMPLETOS + preço + link.
// A página recebe `occasion` = NOME do produto (ex: "60 Ricette Gosto Puro con
// Whey"), mas algumas navegações usam a TAG (ex: "Ricette con Whey"). Por isso
// cada produto é chaveado pelos DOIS — nome e tag — apontando pro mesmo objeto.
const _D = {
  fitness: {
    title: "275 Ricette Fitness Veloci ed Economiche",
    desc: "Sblocca una collezione esclusiva creata per chi desidera mangiare meglio, dimagrire in modo sano, aumentare la massa muscolare e organizzare la propria alimentazione senza complicazioni.",
    bullets: ["275 ricette fitness esclusive", "Colazione, pranzo, cena e spuntini", "Ricette pratiche e veloci da preparare", "Ingredienti semplici e facili da trovare", "Aggiornamenti mensili con nuove ricette", "Opzioni varie per non annoiarti mai della tua alimentazione", "Ricette per dimagrimento, definizione e aumento della massa muscolare", "Meal prep e organizzazione settimanale", "Accesso immediato e a vita"],
    from: "39,90", to: "9,90", link: "https://plvzcnpwbuevakrxnmks.supabase.co/functions/v1/r?c=e34fc5f2-6936-4958-b11b-dd5924bcb84d",
  },
  diabetici: {
    title: "365 Ricette per il Diabete",
    desc: "Sblocca una collezione esclusiva creata per chi desidera controllare la glicemia senza rinunciare al gusto, alla varietà e al piacere di mangiare bene ogni giorno.",
    bullets: ["365 ricette esclusive per tutti i giorni", "Colazione, pranzo, cena e spuntini", "Dolci adattati per ridurre gli eccessi di zucchero", "Ricette a basso indice glicemico", "Ingredienti semplici e facili da trovare", "Informazioni nutrizionali per un maggiore controllo alimentare", "Ricette pratiche per tutta la famiglia", "Accesso immediato e a vita"],
    from: "49,90", to: "9,90", link: "https://pay.hotmart.com/Q104096216Y?off=4t2ify8e&checkoutMode=10",
  },
  cucina: {
    title: "109 Ricette che trasformano la tua routine in cucina",
    desc: "Sblocca una collezione esclusiva creata per chi desidera mangiare bene ogni giorno, risparmiare tempo in cucina e preparare piatti sani, veloci e deliziosi senza stress.",
    bullets: ["109 ricette esclusive testate", "Colazioni, pranzi, cene e piatti veloci", "Ricette sane, pratiche e facili da preparare", "Ingredienti semplici da supermercato", "Opzioni varie per non mangiare sempre le stesse cose", "Valori nutrizionali completi per ogni ricetta", "Ricette perfette per tutta la famiglia", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "49,90", to: "6,99", link: "https://pay.hotmart.com/L104096289F?off=icuf2zkn&checkoutMode=10",
  },
  dolci: {
    title: "99 Dolci Senza Colpa",
    desc: "Sblocca una collezione esclusiva creata per chi desidera gustare dolci deliziosi senza rinunciare a uno stile di vita equilibrato e senza sensi di colpa.",
    bullets: ["99 ricette esclusive di dolci fit e leggeri", "Torte, biscotti, dessert al cucchiaio e snack dolci", "Ricette con meno zuccheri e ingredienti selezionati", "Alternative sane ai dolci tradizionali", "Preparazioni semplici e facili da seguire", "Ingredienti facili da trovare al supermercato", "Valori nutrizionali inclusi", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "49,90", to: "9,90", link: "https://pay.hotmart.com/W105338018I?off=ywaka31p&checkoutMode=10",
  },
  airfryer: {
    title: "Meal Prep Settimanale in Air Fryer",
    desc: "Sblocca una collezione esclusiva creata per chi desidera organizzare i pasti della settimana, risparmiare tempo in cucina e mangiare meglio ogni giorno grazie alla praticità dell'Air Fryer.",
    bullets: ["Ricette complete per il meal prep settimanale", "Colazioni, pranzi, cene e spuntini", "Ricette pratiche e veloci da preparare in Air Fryer", "Ingredienti semplici e facili da trovare", "Pasti equilibrati per tutta la settimana", "Tecniche per ottimizzare tempi e preparazioni", "Idee per conservare e organizzare i pasti", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "49,90", to: "9,90", link: "https://pay.hotmart.com/B105395671K?off=yc4gql96",
  },
  brucia: {
    title: "Menu Brucia-Grassi – 84 Ricette per 21 Giorni",
    desc: "Sblocca una collezione esclusiva creata per chi desidera dimagrire, sgonfiarsi e ritrovare leggerezza senza diete restrittive, grazie a un percorso alimentare pratico e organizzato.",
    bullets: ["84 ricette esclusive organizzate in un programma di 21 giorni", "21 colazioni, 21 pranzi, 21 cene e 21 spuntini fit", "Ricette create per favorire sazietà, leggerezza ed energia", "Menù completo già organizzato giorno per giorno", "Ingredienti semplici e facili da trovare", "Dolci fit e spuntini per evitare le voglie improvvise", "Lista della spesa e organizzazione settimanale", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "34,90", to: "9,99", link: "https://pay.hotmart.com/K106055928C?off=m7gu5dw9&checkoutMode=10",
  },
  antigonf: {
    title: "55 Ricette Gosto Puro Anti-Gonfiore",
    desc: "Sblocca una collezione esclusiva creata per chi desidera ridurre la sensazione di pancia gonfia, migliorare la digestione e ritrovare leggerezza ogni giorno, senza diete radicali e senza passare fame.",
    bullets: ["55 ricette esclusive anti-gonfiore", "Colazioni, pranzi, cene, snack e bevande funzionali", "Protocollo semplice di 7 giorni", "Ricette leggere, pratiche e facili da preparare", "Ingredienti semplici e facili da trovare", "Opzioni pensate per favorire digestione, leggerezza e benessere", "Guide bonus con alimenti che gonfiano e aiutano a sgonfiare", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "19,90", to: "6,99", link: "https://pay.hotmart.com/M106055970I?off=kjrkufzp&checkoutMode=10",
  },
  whey: {
    title: "Guida alle Ricette con Whey",
    desc: "Sblocca una collezione esclusiva creata per chi desidera aumentare l'apporto proteico, migliorare l'alimentazione e trasformare il Whey Protein in ricette deliziose, pratiche e nutrienti.",
    bullets: ["Oltre 60 ricette esclusive con Whey Protein", "Pancake, brownie, mousse, gelati, pane proteico e molto altro", "Ricette dolci e salate per ogni momento della giornata", "Preparazioni semplici e adatte a tutti i livelli", "Ingredienti facili da trovare e preparazioni veloci", "Ricette ideali per definizione, dimagrimento e aumento della massa muscolare", "Valori nutrizionali e suggerimenti pratici inclusi", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "39,90", to: "9,90", link: "https://pay.hotmart.com/T106342263P?off=d431ulad&checkoutMode=10",
  },
  gelati: {
    title: "+70 Ricette di Gelati Artigianali e Sani",
    desc: "Sblocca una collezione esclusiva creata per chi desidera preparare gelati artigianali cremosi, deliziosi e personalizzati direttamente a casa, senza attrezzature professionali e con ingredienti semplici.",
    bullets: ["Oltre 70 ricette esclusive di gelati artigianali", "Gusti classici, esotici, fit e vegani", "Ricette senza gelatiera e facili da preparare", "Tecniche per ottenere una consistenza cremosa perfetta", "Ingredienti semplici e facili da trovare", "Topping, salse e guarnizioni per risultati professionali", "Consigli di conservazione per mantenere gusto e cremosità", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "39,00", to: "9,99", link: "https://pay.hotmart.com/E106332913S?off=t5g50zoh&checkoutMode=10",
  },
  insalate: {
    title: "60 Ricette di Insalate in Barattolo + Salse Irresistibili",
    desc: "Sblocca una collezione esclusiva creata per chi desidera organizzare i pasti della settimana, mangiare più verdure e avere insalate fresche e pronte fino a 7 giorni senza sprechi.",
    bullets: ["60 ricette esclusive di insalate in barattolo", "Salse irresistibili per rendere ogni insalata più gustosa", "Il metodo degli strati per mantenerle fresche fino a 7 giorni", "Ricette pratiche pronte in circa 30 minuti", "Ingredienti semplici e facili da trovare", "Insalate leggere, complete e perfette per pranzo o cena", "Tecniche di conservazione per evitare sprechi alimentari", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "29,90", to: "5,90", link: "https://plvzcnpwbuevakrxnmks.supabase.co/functions/v1/r?c=75eb2075-a92d-4c0f-9b1c-2687e244ffbf",
  },
  menopausa: {
    title: "Piano Menopausa – 92 Ricette Deliziose",
    desc: "Sblocca una collezione esclusiva creata per chi desidera ridurre il gonfiore, ritrovare energia e sentirsi più leggera durante la menopausa e la premenopausa, senza diete estreme e senza rinunciare al gusto.",
    bullets: ["92 ricette esclusive pensate per menopausa e premenopausa", "Colazioni proteiche, pranzi, cene, snack e smoothie funzionali", "Ricette anti-gonfiore e anti-infiammatorie", "Ingredienti semplici e facili da trovare", "Pasti equilibrati per favorire leggerezza e benessere", "Dolci bilanciati per gestire la voglia di zuccheri", "Piano alimentare pratico e facile da seguire", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "39,90", to: "9,90", link: "https://pay.hotmart.com/U104096343S?off=k1ybkvky&checkoutMode=10",
  },
  bibite: {
    title: "98 Bibite Rinfrescanti per l'Estate",
    desc: "Sblocca una collezione esclusiva di bibite fresche e leggere, perfette per le giornate calde: ti dissetano e ti sgonfiano invece di gonfiarti, pronte in meno di 5 minuti con ingredienti che hai già in casa.",
    bullets: ["98 ricette di bibite fresche e leggere", "Frullati, acque detox, smoothie e mocktail analcolici", "Senza zuccheri aggiunti — dolci solo grazie alla frutta", "Pronte in meno di 5 minuti", "Ingredienti semplici che hai già in casa", "Valori nutrizionali completi per ogni ricetta", "Bibite che dissetano e sgonfiano, non appesantiscono", "Aggiornamenti mensili con nuove ricette", "Accesso immediato e a vita"],
    from: "24,90", to: "10,90", link: PREMIUM_LINK,
  },
};
const _GEN = { link: PREMIUM_LINK };
const OCCASION_OFFERS = {
  "275 Ricette Fitness Pratiche ed Economiche": _D.fitness, "Fit": _D.fitness,
  "365 Ricette Deliziose per Diabetici": _D.diabetici, "Diabete": _D.diabetici, "Diabetico": _D.diabetici,
  "99 Dolci Senza Colpa": _D.dolci,
  "Meal Prep Settimanale in Air Fryer": _D.airfryer, "Piatti Settimanali in Air Fryer": _D.airfryer,
  "Menu Brucia Grassi 21 Giorni": _D.brucia,
  "Reset Anti-Gonfiore 7 Giorni": _D.antigonf,
  "60 Ricette Gosto Puro con Whey": _D.whey, "Ricette con Whey": _D.whey,
  "+70 Ricette di Gelati Artigianali": _D.gelati, "Gelati Artigianali": _D.gelati,
  "Insalate in Barattolo + Salse Irresistibili": _D.insalate, "Insalate in Barattolo": _D.insalate,
  "92 Ricette Deliziose per la Menopausa": _D.menopausa, "Menopausa": _D.menopausa,
  "110 e Lode in Cucina Le Ricette Veloci di Melissa": _D.cucina, "Cucina Senza Tempo": _D.cucina,
  "98 Bibite Rinfrescanti per l'Estate": _D.bibite, "Bibite Estate": _D.bibite,
  // Vendáveis sem copy/preço ainda (bloqueiam com link genérico + bullets padrão):
  "Collezione Gosto Puro": _GEN,
  "84 Ricette di Pane Senza Glutine e Senza Latte": _GEN, "Pane Senza Glutine": _GEN,
  "365 Cene con la Friggitrice ad Aria": _GEN, "Friggitrice ad Aria": _GEN,
  "Ricette Low Carb per Dimagrire": _GEN, "Low carb": _GEN,
  "Ricette Detox per il Benessere": _GEN, "Detox": _GEN,
  "150 Ricette Sane + Piano di 35 Giorni": _GEN, "Ricette Sane": _GEN,
  "350 Ricette Facili da Congelare": _GEN, "Facili da Congelare": _GEN,
  "Ricette Senza Zucchero – Dolce Senza Senso di Colpa": _GEN, "Senza zucchero": _GEN,
};
const offerForOccasion = (occ) => OCCASION_OFFERS[occ] || null;
const salesLinkForOccasion = (occ) => OCCASION_OFFERS[occ]?.link || PREMIUM_LINK;
const isSellableOccasion = (occ) => Object.prototype.hasOwnProperty.call(OCCASION_OFFERS, occ);
// Só tem checkout DEDICADO quem está no _D (link próprio, diferente do PREMIUM_LINK).
// As coleções genéricas (_GEN) e as sem oferta vão para a página /Premium do app.
const hasDedicatedCheckout = (occ) => {
  const off = OCCASION_OFFERS[occ];
  return !!off && off !== _GEN && !!off.link && off.link !== PREMIUM_LINK;
};

export default function OccasionRecipesPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const occasion = params.get("occasion") || "";
  // Termos de busca passados pela URL (occasioni reali do prodotto, dal DB).
  // Evita di dover hardcodare il mapping nome-prodotto → occasioni qui.
  const termsParam = params.get("terms") || "";
  const termsFromUrl = termsParam ? termsParam.split("|").filter(Boolean) : null;

  const pageKey = `occ_page_${occasion}`;

  const [allOccasionRecipes, setAllOccasionRecipes] = useState([]);
  const [dailyRecipes, setDailyRecipes] = useState([]);
  const [userRecipes, setUserRecipes] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tutte");
  const [page, setPage] = useState(() => parseInt(sessionStorage.getItem(pageKey) || "1", 10));
  const [soloPerMe, setSoloPerMe] = useState(false);
  const [userDietaryTags, setUserDietaryTags] = useState([]);
  const [user, setUser] = useState(null);


  const showDaily = DAILY_OCCASIONS.includes(occasion);
  const theme = activeTheme(occasion, termsFromUrl);

  // Desbloqueio: coleção com checkout próprio → Hotmart; sem checkout → página
  // /Premium do app (lá o usuário vê o próprio estado e sente vontade de comprar).
  const goUnlock = () => {
    if (hasDedicatedCheckout(occasion)) {
      trackEvent("premium_click", { source: "occasion_checkout", occasion_label: occasion });
      window.open(salesLinkForOccasion(occasion), "_blank", "noopener");
    } else {
      trackEvent("premium_click", { source: "occasion_to_premium_page", occasion_label: occasion });
      navigate("/Premium");
    }
  };

  useEffect(() => {
    if (!occasion) return;
    loadData();
  }, [occasion]);

  const loadData = async () => {
    setLoading(true);
    
    // Fetch user e check acesso
    const userData = await base44.auth.me().catch(() => null);
    setUser(userData);
    
    const occasionTerms = occasionAliases[occasion] || [occasion];

    
    // Use cache to avoid re-fetching on back navigation (con TTL)
    const cacheValid = recipesCache[occasion]
      && recipesCacheTime[occasion]
      && (Date.now() - recipesCacheTime[occasion] < CACHE_TTL_MS);
    if (!cacheValid) {
      const { supabase } = await import("@/lib/supabase");
      const RECIPE_COLS = "id,title,image_url,prep_time,calories,paese,category,description,media_rating,rating_count,numero_salvate,numero_preparate,occasions,lifestyle,dietary_tags,status";

      let filtered = [];

      if (occasion === "Collezione Gosto Puro") {
        const GP_PRODUCT_ONLY_OCCASIONS = new Set([
          "Veloci", "Friggitrice ad Aria", "Facili da Congelare", "Ricette Sane",
          "Senza zucchero", "Low carb", "Detox", "Fit",
          "365 Ricette Deliziose per Diabetici", "Diabete", "Diabetico",
          "275 Ricette Fitness Pratiche ed Economiche",
          "Proteiche",
        ]);
        // Server: pega só receitas com qualquer das ocasiões da coleção
        const { data } = await supabase
          .from("recipes")
          .select(RECIPE_COLS)
          .eq("status", "pubblicata")
          .overlaps("occasions", COLLEZIONE_GOSTO_PURO_OCCASIONS)
          .order("created_at", { ascending: false })
          .limit(2000);
        filtered = (data || []).filter((r) => {
          const rOccasions = r.occasions || [];
          const hasOnlyOtherGP = rOccasions.every(occ => GP_PRODUCT_ONLY_OCCASIONS.has(occ));
          return !hasOnlyOtherGP;
        });
      } else {
        // Prioridade: termos vindos da URL (occasioni reali del prodotto, dal DB).
        // Senão, cai no mapping locale (occasionAliases) ou usa l'occasion stessa.
        const searchTerms = (termsFromUrl && termsFromUrl.length > 0)
          ? termsFromUrl
          : (occasionAliases[occasion] || [occasion]);
        const exclusions = occasionExclusions[occasion] || [];
        // Se vieram terms da URL (prodotto GP), busca SOLO in occasions (preciso).
        // Senão, mantém comportamento legacy (occasions OU lifestyle).
        const onlyOccasions = (termsFromUrl && termsFromUrl.length > 0)
          || GP_PRODUCT_OCCASIONS.has(occasion);

        let query = supabase
          .from("recipes")
          .select(RECIPE_COLS)
          .eq("status", "pubblicata")
          .order("created_at", { ascending: false })
          .limit(2000);

        if (onlyOccasions) {
          query = query.overlaps("occasions", searchTerms);
        } else {
          const termsLit = searchTerms.map(t => `"${t.replace(/"/g, '\\"')}"`).join(",");
          query = query.or(`occasions.ov.{${termsLit}},lifestyle.ov.{${termsLit}}`);
        }

        const { data } = await query;
        filtered = (data || []).filter((r) => {
          const rOccasions = r.occasions || [];
          return !exclusions.some(excl => rOccasions.includes(excl));
        });
      }

      recipesCache[occasion] = filtered;
      recipesCacheTime[occasion] = Date.now();
    }

    const occasionRecipes = recipesCache[occasion];
    setAllOccasionRecipes(occasionRecipes);

    // Pick 3 stable "daily" recipes (deterministic based on today's date)
    if (showDaily && occasionRecipes.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const seed = today.split("-").reduce((a, b) => a + parseInt(b), 0);
      const picked = [];
      for (let i = 0; i < Math.min(3, occasionRecipes.length); i++) {
        picked.push(occasionRecipes[(seed + i * 37) % occasionRecipes.length]);
      }
      setDailyRecipes(picked);
    }

    // Load user favorites + dietary tags in parallel (non-blocking)
    if (userData) {
      const saved = await base44.entities.UserRecipe.filter({ is_saved: true, user_id: userData.id }).catch(() => []);
      const map = {};
      saved.forEach((ur) => { map[ur.recipe_id] = ur; });
      setUserRecipes(map);
      if (userData.dietary_tags_profile?.length > 0) {
        setUserDietaryTags(userData.dietary_tags_profile);
      }
    }

    setLoading(false);
  };

  const dailyIds = useMemo(() => new Set(dailyRecipes.map((r) => r.id)), [dailyRecipes]);

  // All filtering is instant (in-memory) — no re-fetch on page/filter changes
  const filteredRecipes = useMemo(() => {
    return allOccasionRecipes.filter((r) => {
      if (showDaily && dailyIds.has(r.id)) return false;
      // Busca por PALAVRAS: cada parola deve apparire (titolo/descrizione/categoria), in qualsiasi ordine.
      const qTokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = `${r.title || ""} ${r.description || ""} ${r.category || ""}`.toLowerCase();
      const matchesQuery = qTokens.length === 0 || qTokens.every((tok) => haystack.includes(tok));
      const isFit = (r.occasions || []).some(o => o === "Fit" || o === "Fitness")
        || (r.lifestyle || []).some(l => l === "Fit" || l === "Fitness");
      const rOcc = r.occasions || [];
      let matchesCategory;
      if (theme) {
        if (activeCategory === "Tutte") {
          // "Tutte" mostra i prodotti veri, non bonus/consigli (hanno i loro filtri)
          matchesCategory = !theme.extra.some(t => rOcc.includes(t));
        } else {
          const tag = theme.byLabel[activeCategory];
          matchesCategory = tag ? rOcc.includes(tag) : true;
        }
      } else {
        matchesCategory =
          activeCategory === "Tutte" ? true
            : activeCategory === FITNESS_PILL ? isFit
            : r.category === activeCategory;
      }
      const matchesDietary = !soloPerMe || userDietaryTags.length === 0 ||
        userDietaryTags.some(tag => (r.dietary_tags || []).includes(tag));
      return matchesQuery && matchesCategory && matchesDietary;
    });
  }, [allOccasionRecipes, query, activeCategory, dailyIds, showDaily, soloPerMe, userDietaryTags, theme?.occ]);

  // Detecta se a ocasião tem receitas fitness → mostra o pill "💪 Fitness"
  const fitnessCount = useMemo(() =>
    allOccasionRecipes.filter(r =>
      (r.occasions || []).some(o => o === "Fit" || o === "Fitness") ||
      (r.lifestyle || []).some(l => l === "Fit" || l === "Fitness")
    ).length,
    [allOccasionRecipes]
  );
  // Mostra solo le categorie che esistono davvero in questa collezione,
  // così non compaiono filtri vuoti (es. "Cena" dove non ci sono cene).
  const categoryPills = useMemo(() => {
    const present = new Set(allOccasionRecipes.map((r) => r.category).filter(Boolean));
    return ["Tutte", ...CATEGORY_PILLS.slice(1).filter((c) => present.has(c))];
  }, [allOccasionRecipes]);

  // Pagina Gelati: filtri tematici dedicati (Classici/Innovativi/Sani/Vegani/Coperture/Consigli).
  // Altre occasioni: solo le categorie presenti, con "Fitness" dopo "Tutte" se ci sono ricette fit.
  const pills = theme
    ? ["Tutte", ...theme.pills.map((t) => t.label)]
    : fitnessCount > 0
      ? [categoryPills[0], FITNESS_PILL, ...categoryPills.slice(1)]
      : categoryPills;

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  // Slice for current page — O(1), instant
  // Cumulativo: lista contínua que cresce com "Carica altre" (rolagem natural).
  const pagedRecipes = filteredRecipes.slice(0, safePage * PAGE_SIZE);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    sessionStorage.setItem(pageKey, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // "Carica altre": cresce a lista sem rolar pro topo (mantém a posição).
  const loadMore = () => {
    const next = safePage + 1;
    setPage(next);
    sessionStorage.setItem(pageKey, next);
  };

  const handleQueryChange = (val) => { setQuery(val); setPage(1); };
  const handleCategoryChange = (cat) => { setActiveCategory(cat); setPage(1); };

  const icon = OCCASION_ICONS[occasion] || "🍽️";
  const totalCount = allOccasionRecipes.length;

  // Bloqueio no NÍVEL da ocasião: se é uma coleção vendável e o usuário não tem
  // acesso (não é premium full e não comprou essa ocasião), mostra a tela de
  // cadeado com botão para a página de vendas dedicada daquela ocasião.
  const occUnlockedTerms = user?.unlocked_occasions || [];
  // O gate de acesso usa os MESMOS termi do filtro delle ricette (i `terms` da URL
  // do prodotto GP = as occasioni reais della collezione). Senão ele comparava il
  // NOME del prodotto (es. "Ricette Detox per il Benessere") contro le occasioni
  // sbloccate (es. "Detox") e bloccava chi aveva già comprato (bug "tuo ma bloccato").
  const occTerms = (termsFromUrl && termsFromUrl.length > 0)
    ? termsFromUrl
    : (occasionAliases[occasion] || [occasion]);
  const occHasAccess =
    user?.is_full_premium === true ||
    occUnlockedTerms.includes("*") ||
    occTerms.some((t) => occUnlockedTerms.includes(t));
  const occasionLocked = isSellableOccasion(occasion) && !occHasAccess;
  const pitch = premiumPitch(user); // mensagem personalizada (nome + o que já tem)

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A1A1A] px-5 pt-12 pb-5 border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{occasion}</h1>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Collezione completa · {loading ? "…" : totalCount} ricette
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          {[
            { label: "Ricette", value: loading ? "…" : totalCount },
            { label: "Filtrate", value: loading ? "…" : filteredRecipes.length },
            { label: "Preferite", value: Object.keys(userRecipes).length },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-gray-50 dark:bg-white/5 rounded-xl py-2 px-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca ricette..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#2D6A4F]"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
          {pills.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeCategory === cat
                  ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                  : cat === FITNESS_PILL
                  ? "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400"
                  : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Solo per me toggle — only show if user has dietary tags */}
        {userDietaryTags.length > 0 && (
          <button
            onClick={() => { setSoloPerMe(v => !v); setPage(1); }}
            className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              soloPerMe
                ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300"
            }`}
          >
            🎯 Solo per me
            {soloPerMe && <span className="text-[10px] opacity-80">({userDietaryTags.length} restrizioni)</span>}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
          </div>
        ) : (
          <>
            {/* Ricette del Giorno — only for Colazione, Pranzo, Cena */}
            {showDaily && dailyRecipes.length > 0 && !query && activeCategory === "Tutte" && (
              <div className="mb-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                  Ricette del Giorno 🍽️
                </h2>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
                  {dailyRecipes.map((recipe) => (
                    <DailyRecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      isSaved={!!userRecipes[recipe.id]}
                    />
                  ))}
                </div>
                <div className="mt-5 border-t border-gray-100 dark:border-[#2A2A2A]" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4 mb-3">
                  Tutte le ricette
                </p>
              </div>
            )}

            {filteredRecipes.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🍽️</p>
                <p className="text-gray-400 font-semibold">Nessuna ricetta trovata</p>
                {query && <p className="text-gray-500 text-sm mt-1">Prova a modificare la ricerca</p>}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  {occasionLocked
                    ? `Anteprima — ${filteredRecipes.length} ricette in questa raccolta`
                    : `Mostrando ${Math.min(safePage * PAGE_SIZE, filteredRecipes.length)} di ${filteredRecipes.length} ricette`}
                </p>

                <div className="relative">
                  <div className={occasionLocked ? "space-y-3 blur-[3px] select-none pointer-events-none opacity-60" : "space-y-3"}>
                   {(occasionLocked ? pagedRecipes.slice(0, 9) : pagedRecipes).map((recipe) => (
                     <RecipeCard
                       key={recipe.id}
                       recipe={recipe}
                       occasion={occasion}
                       isSaved={!!userRecipes[recipe.id]}
                       user={user}
                       isBlocked={occasionLocked}
                       onBlockedClick={goUnlock}
                     />
                   ))}
                  </div>

                  {occasionLocked && (
                    <div className="absolute inset-0 flex justify-center pointer-events-none">
                      <div className="sticky top-24 self-start pointer-events-auto w-full max-w-sm mx-3 mt-8">
                        <div className="relative bg-white dark:bg-[#1A1A1A] border border-amber-100 dark:border-[#2A2A2A] rounded-3xl shadow-2xl shadow-black/10 overflow-hidden">
                          {/* Faixa superior */}
                          <div className="bg-gradient-to-r from-[#2D6A4F] to-[#40916C] px-5 py-4">
                            <p className="text-white text-sm font-extrabold tracking-wide flex items-center gap-2">
                              <Lock className="w-4 h-4" /> COLLEZIONE BLOCCATA
                            </p>
                            <p className="text-white/80 text-[11px] mt-0.5">{filteredRecipes.length} ricette esclusive</p>
                          </div>

                          <div className="p-5">
                            {pitch && (
                              <div className="mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2">
                                <p className="text-[12px] leading-snug text-emerald-900 dark:text-emerald-200">
                                  <b>{pitch.greeting}</b>{" "}
                                  {pitch.variant === "partial"
                                    ? <>hai già <b>{pitch.owned.slice(0, 3).join(", ")}</b>. Questa raccolta non è ancora tua.</>
                                    : <>sei <b>Free</b>: 40 ricette sbloccate su oltre 4.000. Questa raccolta è ancora bloccata.</>}
                                </p>
                              </div>
                            )}
                            <h3 className="text-[19px] font-extrabold text-gray-900 dark:text-white mb-2 leading-[1.2]">{offerForOccasion(occasion)?.title || occasion}</h3>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                              {offerForOccasion(occasion)?.desc
                                || `Sblocca tutte le ${filteredRecipes.length} ricette di questa raccolta e cucina senza limiti.`}
                            </p>

                            {/* Destaques — copy completa da coleção, num painel com divisórias */}
                            <ul className="mb-4 rounded-2xl bg-[#F6F8F6] dark:bg-white/[0.04] border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/[0.06] overflow-hidden">
                              {(offerForOccasion(occasion)?.bullets || [
                                "Accesso immediato e a vita",
                                "Ingredienti semplici e facili da trovare",
                                "Valori nutrizionali completi",
                                "Aggiornamenti mensili con nuove ricette",
                              ]).map((h, i) => (
                                <li key={i} className="flex items-start gap-3 px-3.5 py-2.5">
                                  <span className="w-[18px] h-[18px] mt-px rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm shadow-[#2D6A4F]/30">✓</span>
                                  <span className="text-[12.5px] leading-snug text-gray-700 dark:text-gray-200">{h}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Preço */}
                            {offerForOccasion(occasion)?.to && (
                              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-3 mb-4 text-center">
                                <p className="text-[10px] font-bold text-amber-700/90 dark:text-amber-400/90 uppercase tracking-widest mb-1">Offerta speciale di sblocco</p>
                                <div className="flex items-baseline justify-center gap-2">
                                  {offerForOccasion(occasion)?.from && (
                                    <span className="text-sm text-gray-400 line-through">€{offerForOccasion(occasion).from}</span>
                                  )}
                                  <span className="text-3xl font-extrabold text-[#2D6A4F] dark:text-emerald-400 leading-none">€{offerForOccasion(occasion).to}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">Pagamento unico • Nessun abbonamento • Accesso immediato</p>
                              </div>
                            )}

                            <button
                              onClick={goUnlock}
                              className="flex items-center justify-center gap-2 w-full bg-[#2D6A4F] hover:bg-[#245A42] text-white font-extrabold py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-[#2D6A4F]/25"
                            >
                              🟢 Sblocca Ora
                            </button>
                            {/* Prova social SEM preço (o preço já está no bloco da oferta acima,
                                evita divergência com o 34,90 € do Premium geral). */}
                            <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-gray-500">
                              🔒 Garanzia 7 giorni · 53.000+ membri soddisfatti · ★ 4.9
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!occasionLocked && pagedRecipes.length < filteredRecipes.length && (
                  <div className="mt-6">
                    <button
                      onClick={loadMore}
                      className="w-full py-3.5 rounded-2xl bg-[#2D6A4F] text-white text-sm font-bold active:scale-[0.98] transition-transform shadow-lg shadow-[#2D6A4F]/20 flex items-center justify-center gap-2"
                    >
                      Carica altre ricette
                      <span className="font-normal opacity-80">· {filteredRecipes.length - pagedRecipes.length} rimanenti</span>
                    </button>
                  </div>
                )}
                {occasionLocked && totalPages > 1 && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    🔒 {totalPages} pagine di ricette in questa raccolta — sblocca per vederle tutte
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DailyRecipeCard({ recipe, isSaved }) {
  const kcal = recipe.calorie ?? recipe.calories;
  return (
    <Link
      to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
      className="flex-shrink-0 w-44 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform"
    >
      <div className="relative w-full h-28">
        <img
          src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=300"}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        {isSaved && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        )}
        {kcal && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            🔥 {kcal} kcal
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {recipe.title}
        </p>
        {recipe.prep_time && (
          <p className="text-[10px] text-gray-400 mt-1">⏱ {recipe.prep_time} min</p>
        )}
      </div>
    </Link>
  );
}

function RecipeCard({ recipe, occasion, isSaved, user, isBlocked, onBlockedClick }) {
  const kcal = recipe.calorie ?? recipe.calories;
  


      return (
      <Link
      to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
      className="flex gap-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm"
      >
      <div className="w-24 flex-shrink-0 relative self-stretch">
      <img
        src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=200"}
        alt={recipe.title}
        className="w-full h-full object-cover"
      />
      {isSaved && (
         <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
           <Heart className="w-3 h-3 text-white fill-white" />
         </div>
       )}
       </div>

       <div className="flex-1 py-3 pr-3 min-w-0">
         <div className="flex gap-1.5 flex-wrap mb-1.5">
           <span className="text-[10px] font-bold bg-green-100 text-gray-900 px-2 py-0.5 rounded-full">
             {occasion}
           </span>
           {recipe.category && recipe.category !== occasion && (
             <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
               {recipe.category}
             </span>
           )}
         </div>

         <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1.5"
           style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
           {recipe.title}
         </p>

         <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
           {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
           {kcal && <span>🔥 {kcal} kcal</span>}
           {recipe.difficulty && <span>{recipe.difficulty}</span>}
           {recipe.media_rating && (
             <span className="flex items-center gap-0.5">
               <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
               {recipe.media_rating}
             </span>
           )}
         </div>

         {(recipe.dietary_tags || []).length > 0 && (
           <div className="flex gap-1 flex-wrap">
             {recipe.dietary_tags.slice(0, 3).map((tag) => (
               <span
                 key={tag}
                 className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${DIETARY_TAG_COLORS[tag] || "bg-gray-100 text-gray-700"}`}
               >
                 {tag}
               </span>
             ))}
           </div>
         )}
       </div>
      </Link>
      );
      }