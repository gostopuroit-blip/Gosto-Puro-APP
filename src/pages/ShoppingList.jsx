import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RotateCcw, Share2, Printer, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Corredores do supermercato (ordem de quem percorre o mercado)
const CATEGORIES = {
  "Ortofrutta": "🥬",
  "Carne e pesce": "🍗",
  "Latticini": "🧈",
  "Dispensa": "🥫",
  "Surgelati": "❄️",
  "Altro": "🛍️",
};
const CATEGORY_ORDER = ["Ortofrutta", "Carne e pesce", "Latticini", "Dispensa", "Surgelati", "Altro"];

// Palavras-chave para inferir o corredor quando a receita não traz `category`
const CATEGORY_KEYWORDS = {
  "Ortofrutta": ["pomodor", "insalata", "lattuga", "mela", "banan", "limon", "aranc", "cipoll", "aglio", "carot", "zucchin", "patat", "spinac", "basilico", "prezzemolo", "fragol", "frutta", "verdur", "sedano", "peperon", "melanzan", "broccol", "finocchi", "rucola", "avocado", "zenzero", "uva", "pera", "pesca", "kiwi", "ananas", "anguria", "melone", "funghi", "porro", "cetriolo", "radicchio", "cavolo", "bietola", "menta"],
  "Carne e pesce": ["pollo", "manzo", "vitell", "maiale", "salsicc", "prosciutto", "tonno", "salmon", "pesce", "gamber", "carne", "tacchino", "bresaola", "speck", "merluzz", "orata", "branzino", "acciugh", "calamar", "polpo", "wurstel", "pancetta", "guancial", "macinat"],
  "Latticini": ["latte", "yogurt", "formagg", "parmigian", "mozzarell", "burro", "ricott", "panna", "uova", "uovo", "mascarpone", "grana", "stracchino", "gorgonzol", "feta", "scamorza", "philadelphia", "pecorino", "fontina", "kefir", "skyr"],
  "Dispensa": ["pasta", "riso", "farina", "zucchero", "sale", "olio", "aceto", "pane", "miele", "cioccolat", "cacao", "lievito", "passata", "legumi", "fagiol", "ceci", "lenticch", "avena", "mandorl", "noci", "caffè", "conserv", "biscott", "cracker", "marmellat", "tonn", "pomodori pelati", "brodo", "spezie", "pepe", "curry", "cannella", "vaniglia", "cocco", "semi", "fiocchi", "couscous", "quinoa", "orzo", "polenta", "amido"],
  "Surgelati": ["surgelat", "gelato", "ghiaccio", "congelat"],
};

function inferCategory(name) {
  const n = (name || "").toLowerCase();
  for (const cat of CATEGORY_ORDER) {
    const kws = CATEGORY_KEYWORDS[cat];
    if (kws && kws.some((kw) => n.includes(kw))) return cat;
  }
  return "Altro";
}

// Normaliza unità (plurale → singolare, sigle) così "cucchiai" e "cucchiaio" si fondono
const UNIT_NORMALIZE = {
  g: "g", gr: "g", grammi: "g", grammo: "g",
  kg: "kg", chilo: "kg", chili: "kg",
  ml: "ml", cl: "cl", dl: "dl", l: "l", litro: "l", litri: "l",
  cucchiai: "cucchiaio", cucchiaio: "cucchiaio",
  cucchiaini: "cucchiaino", cucchiaino: "cucchiaino",
  spicchi: "spicchio", spicchio: "spicchio",
  fette: "fetta", fetta: "fetta",
  foglie: "foglia", foglia: "foglia", foglioline: "fogliolina", fogliolina: "fogliolina",
  tazze: "tazza", tazza: "tazza", tazzine: "tazzina", tazzina: "tazzina",
  pizzichi: "pizzico", pizzico: "pizzico",
  rametti: "rametto", rametto: "rametto",
  manciate: "manciata", manciata: "manciata",
  gambi: "gambo", gambo: "gambo",
  pezzi: "pezzo", pezzo: "pezzo",
  uova: "uova", uovo: "uova",
};
function normalizeUnit(u) {
  const first = (u || "").trim().toLowerCase().split(/\s+/)[0]; // só 1º token (ignora "d'oliva" etc.)
  return UNIT_NORMALIZE[first] || first;
}

// "200 g" / "1,5 l" / "2 cucchiai d'oliva" → { num, unit }. Texto puro (q.b., a piacere) → null
function parseQty(q) {
  if (!q) return null;
  const s = String(q).trim();
  if (/^q\.?b\.?$/i.test(s) || /a\s*piacere/i.test(s)) return null;
  const m = s.match(/^([\d]+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  if (isNaN(num)) return null;
  return { num, unit: normalizeUnit(m[2]) };
}

function fmtNum(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

const WEEK_SIZE = 7;
// Quante "settimane" copre il piano (7gg = 1, 15gg = 3, 30gg = 5)
const weekCount = (p) => Math.max(1, Math.ceil(((p?.plan_data || []).length) / WEEK_SIZE));

// "2026-06-30" → "30/6"
function shortDate(iso) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  if (parts.length < 3) return "";
  return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
}

// Aggrega gli ingredienti di un insieme di giorni, scalati per le porzioni
function aggregateDays(days, recipeMap, planServings) {
  const occurrences = [];
  for (const day of days) {
    for (const slot of ["colazione", "pranzo", "snack", "cena"]) {
      const id = day[`${slot}_id`];
      if (!id) continue;
      occurrences.push({ id, servings: day[`${slot}_servings`] || planServings || 1 });
    }
  }
  const agg = {};
  for (const occ of occurrences) {
    const r = recipeMap[occ.id];
    if (!r) continue;
    const base = Number(r.servings) || occ.servings || 1;
    const factor = base > 0 ? occ.servings / base : 1;
    for (const ing of r.ingredients || []) {
      if (!ing || !ing.name) continue;
      const key = ing.name.toLowerCase().trim();
      if (!agg[key]) {
        agg[key] = {
          name: ing.name.trim(),
          category: CATEGORIES[ing.category] ? ing.category : inferCategory(ing.name),
          units: {},
          texts: new Set(),
        };
      }
      const p = parseQty(ing.quantity);
      if (p) agg[key].units[p.unit] = (agg[key].units[p.unit] || 0) + p.num * factor;
      else if (ing.quantity) agg[key].texts.add(String(ing.quantity).trim());
    }
  }
  return Object.values(agg);
}

// { units, texts } → stringa quantità ("200 g + 2 cucchiaio")
function formatEntryQty(entry) {
  const parts = Object.entries(entry.units).map(([unit, total]) =>
    unit ? `${fmtNum(total)} ${unit}` : fmtNum(total)
  );
  if (parts.length === 0 && entry.texts.size > 0) return [...entry.texts][0];
  if ([...entry.texts].some((t) => /q\.?b\.?/i.test(t))) return parts.length ? parts.join(" + ") : "q.b.";
  return parts.join(" + ");
}

export default function ShoppingList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [selectedWeek, setSelectedWeek] = useState(null); // null = piano da 7 giorni (nessun selettore)
  const [updating, setUpdating] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const mealPlanId = params.get("meal_plan_id");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPlanId]);

  const resolvePlan = async () => {
    if (mealPlanId) {
      const res = await base44.entities.MealPlan.filter({ id: mealPlanId });
      return res[0] || null;
    }
    // Fallback: piano attivo dell'utente (evita lo spinner infinito)
    const me = await base44.auth.me().catch(() => null);
    const active = await base44.entities.MealPlan.filter(
      { is_active: true, user_id: me?.id },
      "-created_at",
      1
    );
    return active[0] || null;
  };

  const loadData = async () => {
    setLoading(true);
    const activePlan = await resolvePlan();
    setPlan(activePlan);

    if (!activePlan) {
      setItems([]);
      setLoading(false);
      return;
    }

    let shoppingItems = await base44.entities.ShoppingItem.filter({ meal_plan_id: activePlan.id }, "-created_at", 5000);

    const nWeeks = weekCount(activePlan);
    const hasDays = Array.isArray(activePlan.plan_data) && activePlan.plan_data.length > 0;
    // Rigenera se vuota OPPURE se è un piano multi-settimana ma gli item non hanno ancora la settimana
    const needsWeeks = nWeeks > 1 && shoppingItems.length > 0 && shoppingItems.every((i) => i.week == null);
    if (hasDays && (shoppingItems.length === 0 || needsWeeks)) {
      shoppingItems = await generateItems(activePlan);
    }

    setItems(shoppingItems);
    setSelectedWeek(nWeeks > 1 ? 1 : null);
    setLoading(false);
  };

  // Costruisce gli articoli aggregando gli ingredienti, scalati per le porzioni.
  // Su piani lunghi (15/30gg) genera una lista PER SETTIMANA così la spesa è gestibile.
  const generateItems = async (activePlan) => {
    const days = activePlan.plan_data || [];
    const allIds = [
      ...new Set(
        days.flatMap((d) =>
          ["colazione", "pranzo", "snack", "cena"].map((s) => d[`${s}_id`]).filter(Boolean)
        )
      ),
    ];
    if (allIds.length === 0) return [];

    const recipes = await base44.entities.Recipe.filter({ id: { $in: allIds } }, "-created_date", 300);
    const recipeMap = {};
    recipes.forEach((r) => { if (r) recipeMap[r.id] = r; });

    const nWeeks = weekCount(activePlan);
    const newItems = [];
    for (let w = 0; w < nWeeks; w++) {
      const weekDays = days.slice(w * WEEK_SIZE, w * WEEK_SIZE + WEEK_SIZE);
      for (const entry of aggregateDays(weekDays, recipeMap, activePlan.servings)) {
        newItems.push({
          name: entry.name,
          quantity: formatEntryQty(entry),
          category: entry.category,
          is_checked: false,
          meal_plan_id: activePlan.id,
          week: nWeeks > 1 ? w + 1 : null,
        });
      }
    }

    // Sostituisce la lista in DB
    const old = await base44.entities.ShoppingItem.filter({ meal_plan_id: activePlan.id }, "-created_at", 5000);
    await Promise.all(old.map((it) => base44.entities.ShoppingItem.delete(it.id)));
    if (newItems.length > 0) await base44.entities.ShoppingItem.bulkCreate(newItems);

    return base44.entities.ShoppingItem.filter({ meal_plan_id: activePlan.id }, "-created_at", 5000);
  };

  const regenerate = async () => {
    if (!plan) return;
    setUpdating(true);
    try {
      const fresh = await generateItems(plan);
      setItems(fresh);
      toast.success("Lista aggiornata! ✓");
    } catch (e) {
      toast.error("Errore nell'aggiornamento");
      console.error(e);
    }
    setUpdating(false);
  };

  const toggleItem = async (item) => {
    const newChecked = !item.is_checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: newChecked } : i)));
    base44.entities.ShoppingItem.update(item.id, { is_checked: newChecked }).catch(() => {});
  };

  const buildText = () => {
    const visible = selectedWeek == null ? items : items.filter((i) => i.week === selectedWeek);
    const header = "🛒 Lista della spesa" + (selectedWeek ? ` — Settimana ${selectedWeek}` : "");
    const lines = [header, plan?.name ? `(${plan.name})` : "", ""];
    CATEGORY_ORDER.forEach((cat) => {
      const list = visible.filter((i) => (i.category || "Altro") === cat);
      if (!list.length) return;
      lines.push(`${CATEGORIES[cat]} ${cat}`);
      list.forEach((i) => lines.push(`• ${i.name}${i.quantity ? ` — ${i.quantity}` : ""}`));
      lines.push("");
    });
    return lines.join("\n").trim();
  };

  const share = async () => {
    const text = buildText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Lista della spesa", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Lista copiata! Incollala dove vuoi 📋");
      }
    } catch (e) {
      // utente ha annullato lo share → nessun errore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
        <span className="text-4xl">🛒</span>
        <p className="text-gray-500 dark:text-gray-400">Crea prima un piano per generare la lista della spesa.</p>
        <Button onClick={() => navigate("/Planner")} className="bg-[#2D6A4F] hover:bg-[#235c43] text-white">
          Vai al Planner
        </Button>
      </div>
    );
  }

  const nWeeks = weekCount(plan);
  const weeks = Array.from({ length: nWeeks }, (_, w) => {
    const dd = (plan.plan_data || []).slice(w * WEEK_SIZE, w * WEEK_SIZE + WEEK_SIZE);
    const a = shortDate(dd[0]?.date);
    const b = shortDate(dd[dd.length - 1]?.date);
    return { n: w + 1, range: a && b ? `${a}–${b}` : `${dd.length} gg` };
  });

  // Item della settimana selezionata (o tutti, se piano da 7 giorni)
  const weekItems = selectedWeek == null ? items : items.filter((i) => i.week === selectedWeek);

  const groupedItems = {};
  weekItems.forEach((item) => {
    const cat = item.category || "Altro";
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const visibleCats = (selectedCategory === "Tutti" ? CATEGORY_ORDER : [selectedCategory]).filter(
    (cat) => groupedItems[cat]
  );

  const total = weekItems.length;
  const checkedCount = weekItems.filter((i) => i.is_checked).length;
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  return (
    <div className="pb-44">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 sticky top-0 bg-white dark:bg-[#0F0F0F] z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Lista della spesa</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {nWeeks > 1 && selectedWeek
                ? `Settimana ${selectedWeek} · ${total} articoli`
                : `${total} articoli · ${plan.days || (plan.plan_data || []).length} giorni`}
            </p>
          </div>
          <button
            onClick={regenerate}
            disabled={updating}
            title="Rigenera dalla pianificazione"
            className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
          >
            <RotateCcw className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${updating ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Progresso */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {checkedCount} di {total} presi
            </span>
            <button
              onClick={() => setHideChecked((v) => !v)}
              className="text-xs font-semibold text-[#2D6A4F] dark:text-[#40916C] flex items-center gap-1"
            >
              {hideChecked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {hideChecked ? "Mostra presi" : "Nascondi presi"}
            </button>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-[#2A2A2A] rounded-full overflow-hidden">
            <div className="h-full bg-[#2D6A4F] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Selettore settimana (solo piani 15/30 giorni) */}
      {nWeeks > 1 && (
        <div className="px-5 pt-1 pb-1">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {weeks.map((w) => (
              <button
                key={w.n}
                onClick={() => setSelectedWeek(w.n)}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-center transition-all border-2 ${
                  selectedWeek === w.n
                    ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                    : "bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#2A2A2A] text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="block text-sm font-bold leading-tight whitespace-nowrap">Settimana {w.n}</span>
                <span className={`block text-[10px] leading-tight ${selectedWeek === w.n ? "text-white/75" : "text-gray-400 dark:text-gray-500"}`}>
                  {w.range}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtro corridoi */}
      <div className="px-5 py-2">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {["Tutti", ...CATEGORY_ORDER.filter((c) => groupedItems[c])].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full font-semibold text-sm transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-[#2D6A4F] text-white"
                  : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-700 dark:text-gray-300"
              }`}
            >
              {cat === "Tutti" ? "Tutti" : `${CATEGORIES[cat]} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* Articoli */}
      <div className="px-5 py-2">
        {visibleCats.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-3xl">🧺</span>
            <p className="text-gray-400 text-sm">Nessun ingrediente nella lista</p>
            <Button onClick={regenerate} disabled={updating} className="bg-[#2D6A4F] hover:bg-[#235c43] text-white text-sm">
              <RotateCcw className="w-4 h-4 mr-2" /> Genera lista
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {visibleCats.map((category) => {
              const list = hideChecked
                ? groupedItems[category].filter((i) => !i.is_checked)
                : groupedItems[category];
              if (list.length === 0) return null;
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{CATEGORIES[category]}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{category}</span>
                    <span className="text-xs text-gray-400 ml-auto">{list.length}</span>
                  </div>

                  <div className="space-y-2">
                    {list.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                          item.is_checked
                            ? "bg-[#F0F7F4] dark:bg-[#1A2B20] border-[#2D6A4F]/20"
                            : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-[#2A2A2A]"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                            item.is_checked
                              ? "bg-[#2D6A4F] border-[#2D6A4F]"
                              : "border-gray-300 dark:border-[#444444]"
                          }`}
                        >
                          {item.is_checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                        </span>

                        <span className="flex-1 min-w-0">
                          <span
                            className={`block text-[15px] font-semibold leading-snug break-words ${
                              item.is_checked
                                ? "line-through text-gray-400 dark:text-gray-500"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span
                              className={`block text-[13px] font-bold mt-0.5 ${
                                item.is_checked
                                  ? "text-gray-300 dark:text-gray-600"
                                  : "text-[#2D6A4F] dark:text-[#40916C]"
                              }`}
                            >
                              {item.quantity}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: Condividi + Stampa — sopra la barra di navigazione (alta ~70px) */}
      <div className="fixed bottom-[70px] left-0 right-0 bg-white dark:bg-[#0F0F0F] border-t border-gray-100 dark:border-[#2A2A2A] px-5 py-3 max-w-lg mx-auto z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2">
          <Button
            onClick={share}
            className="flex-1 bg-[#2D6A4F] hover:bg-[#235c43] text-white py-5 rounded-2xl font-bold"
          >
            <Share2 className="w-4 h-4 mr-2" /> Condividi
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="px-5 py-5 rounded-2xl border-2"
            title="Stampa"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
