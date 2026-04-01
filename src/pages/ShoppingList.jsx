import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2, ShoppingCart, RefreshCw, Trash2, Printer, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PremiumGate from "@/components/PremiumGate";

const categoryIcons = {
  "Ortofrutta": "🥬",
  "Carne e pesce": "🥩",
  "Latticini": "🧀",
  "Dispensa": "🏪",
  "Surgelati": "🧊",
  "Altro": "📦",
};

const categoryOrder = ["Ortofrutta", "Carne e pesce", "Latticini", "Dispensa", "Surgelati", "Altro"];

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const u = await base44.auth.me().catch(() => null);
    setUser(u);
    if (!u) { setLoading(false); return; }

    // Load existing items first — only regenerate if none exist
    const existing = await base44.entities.ShoppingItem.filter({ created_by: u.email }, "category", 100);
    if (existing.length > 0) {
      setItems(existing);
      setLoading(false);
    } else {
      await generateList(u);
    }
  };

  const generateList = async (currentUser) => {
    const u = currentUser || user;
    if (!u) return;
    setGenerating(true);
    setLoading(false);
    
    // Get active plan
    const plans = await base44.entities.MealPlan.filter({ is_active: true, created_by: u?.email }, "-created_date", 1);
    
    if (plans.length === 0) {
      // Delete any orphaned items and show empty state
      const oldItems = await base44.entities.ShoppingItem.filter({ created_by: u?.email }, "category", 100);
      for (let i = 0; i < oldItems.length; i += 5) {
        await Promise.all(oldItems.slice(i, i + 5).map((item) => base44.entities.ShoppingItem.delete(item.id)));
      }
      setItems([]);
      setLoading(false);
      setGenerating(false);
      toast.error("Nessun piano attivo trovato");
      return;
    }

    const plan = plans[0];
    const recipeIds = [...new Set(
      plan.plan_data
        .flatMap((d) => [d.colazione_id, d.pranzo_id, d.cena_id])
        .filter(Boolean)
    )];

    // Fetch all published recipes in one call and filter locally by ID
    const allRecipes = await base44.entities.Recipe.list("-created_date", 200);
    const recipeMap = Object.fromEntries(allRecipes.map((r) => [r.id, r]));
    const planRecipes = recipeIds.map((id) => recipeMap[id]).filter(Boolean);

    // Merge ingredients — sum numeric quantities, deduplicate by normalized name
    const merged = {};

    const parseQty = (str) => {
      if (!str) return { num: 0, unit: "" };
      const s = String(str).trim();
      const match = s.match(/^([\d.,]+)\s*(.*)/);
      if (match) return { num: parseFloat(match[1].replace(",", ".")), unit: match[2].trim().toLowerCase() };
      return { num: 0, unit: s.toLowerCase() };
    };

    const formatQty = (num, unit) => {
      const n = Number.isInteger(num) ? num : parseFloat(num.toFixed(1));
      return unit ? `${n} ${unit}` : `${n}`;
    };

    // Scale ratio: plan.servings / recipe.servings
    const planServings = plan.servings || 2;
    const scaleQty = (qtyStr, ratio) => {
      if (!qtyStr) return "";
      if (ratio === 1) return String(qtyStr);
      const { num, unit } = parseQty(qtyStr);
      if (num > 0) return formatQty(num * ratio, unit);
      return String(qtyStr);
    };

    for (const recipe of planRecipes) {
      const ratio = planServings / (recipe.servings || 4);
      for (const ing of (recipe.ingredients || [])) {
        const scaledQty = scaleQty(ing.quantity, ratio);
        const key = ing.name.toLowerCase().trim().replace(/\s+/g, " ");
        if (merged[key]) {
          const existing = parseQty(merged[key].rawQty);
          const incoming = parseQty(scaledQty);
          if (existing.num > 0 && incoming.num > 0 && existing.unit === incoming.unit) {
            merged[key].rawQty = formatQty(existing.num + incoming.num, existing.unit);
          } else if (existing.num > 0 && incoming.num > 0) {
            // different units — sum the numbers, keep first unit (best effort)
            merged[key].rawQty = formatQty(existing.num + incoming.num, existing.unit || incoming.unit);
          } else {
            merged[key].rawQty = scaledQty || merged[key].rawQty;
          }
        } else {
          merged[key] = {
            name: ing.name,
            rawQty: scaledQty,
            category: ing.category || "Altro",
          };
        }
      }
    }

    // Delete old items in batches to avoid rate limit
    const oldItems = await base44.entities.ShoppingItem.filter({ created_by: u?.email }, "category", 100);
    for (let i = 0; i < oldItems.length; i += 5) {
      await Promise.all(oldItems.slice(i, i + 5).map((item) => base44.entities.ShoppingItem.delete(item.id).catch(() => null)));
    }

    // Create new items
    const newItems = Object.values(merged).map((ing) => ({
      name: ing.name,
      quantity: ing.rawQty,
      category: categoryOrder.includes(ing.category) ? ing.category : "Altro",
      is_checked: false,
      meal_plan_id: plan.id,
    }));

    if (newItems.length > 0) {
      await base44.entities.ShoppingItem.bulkCreate(newItems);
    }

    const created = await base44.entities.ShoppingItem.filter({ created_by: u?.email }, "category", 100);
    setItems(created);
    setLoading(false);
    setGenerating(false);
    toast.success("Lista generata!");
  };

  const toggleItem = async (item) => {
    await base44.entities.ShoppingItem.update(item.id, { is_checked: !item.is_checked });
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: !i.is_checked } : i))
    );
  };

  const clearChecked = async () => {
    const checked = items.filter((i) => i.is_checked);
    for (let i = 0; i < checked.length; i += 5) {
      await Promise.all(checked.slice(i, i + 5).map((item) => base44.entities.ShoppingItem.delete(item.id).catch(() => null)));
    }
    setItems((prev) => prev.filter((i) => !i.is_checked));
    toast.success("Elementi completati rimossi");
  };

  const batchUpdate = async (targetItems, checked) => {
    // Update UI immediately
    setItems(prev => prev.map(i => targetItems.find(t => t.id === i.id) ? { ...i, is_checked: checked } : i));
    // Update in batches of 3 to avoid rate limit
    for (let i = 0; i < targetItems.length; i += 3) {
      await Promise.all(targetItems.slice(i, i + 3).map(item => base44.entities.ShoppingItem.update(item.id, { is_checked: checked }).catch(() => null)));
    }
  };

  const selectAll = () => batchUpdate(items.filter(i => !i.is_checked), true);
  const deselectAll = () => batchUpdate(items.filter(i => i.is_checked), false);

  const handlePrint = () => {
    const displayItems = showOnlyMissing ? items.filter(i => !i.is_checked) : items;
    const grouped = categoryOrder.reduce((acc, cat) => {
      const catItems = displayItems.filter(i => i.category === cat);
      if (catItems.length > 0) acc[cat] = catItems;
      return acc;
    }, {});

    const html = `
      <html><head><title>Lista della Spesa</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 16px; }
        h2 { font-size: 14px; text-transform: uppercase; color: #555; margin: 16px 0 6px; letter-spacing: 1px; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .qty { color: #888; }
      </style></head>
      <body>
        <h1>🛒 Lista della Spesa</h1>
        ${Object.entries(grouped).map(([cat, catItems]) => `
          <h2>${categoryIcons[cat] || "📦"} ${cat}</h2>
          <ul>${catItems.map(i => `<li><span>${i.name}</span><span class="qty">${i.quantity || ""}</span></li>`).join("")}</ul>
        `).join("")}
      </body></html>
    `;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const displayItems = showOnlyMissing ? items.filter(i => !i.is_checked) : items;

  const groupedItems = categoryOrder.reduce((acc, cat) => {
    const catItems = displayItems.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  const checkedCount = items.filter((i) => i.is_checked).length;
  const totalCount = items.length;
  const missingCount = totalCount - checkedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PremiumGate user={user} feature="la Lista della Spesa">
        <div>
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lista della Spesa</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {totalCount > 0
                ? `${checkedCount}/${totalCount} completati`
                : "Genera dal tuo piano"}
            </p>
          </div>
          <div className="flex gap-2">
            {checkedCount > 0 && (
              <Button size="sm" variant="outline" onClick={clearChecked} className="rounded-xl">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {totalCount > 0 && (
              <Button size="sm" variant="outline" onClick={handlePrint} className="rounded-xl">
                <Printer className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={generateList}
              disabled={generating}
              className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43] gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
          </div>
        </div>

        {/* Action row */}
        {totalCount > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Seleziona tutto
            </button>
            <button onClick={deselectAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Deseleziona tutto
            </button>
            <button
              onClick={() => setShowOnlyMissing(!showOnlyMissing)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center gap-1 ${
                showOnlyMissing
                  ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-3 h-3" />
              Solo mancanti {showOnlyMissing && missingCount > 0 ? `(${missingCount})` : ""}
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="px-5 mb-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2D6A4F] rounded-full transition-all duration-500"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-5 text-center py-20">
          <div className="w-20 h-20 bg-[#F0F7F4] rounded-3xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-10 h-10 text-[#2D6A4F]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Nessun elemento</h2>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Crea un piano settimanale per generare automaticamente la lista della spesa
          </p>
        </div>
      ) : (
        <div className="px-5 space-y-5">
          {Object.entries(groupedItems).map(([category, catItems]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">{categoryIcons[category] || "📦"}</span>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {category}
                </h3>
                <span className="text-[10px] text-gray-300 font-medium">({catItems.length})</span>
              </div>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50">
                {catItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                      idx < catItems.length - 1 ? "border-b border-gray-50" : ""
                    } ${item.is_checked ? "bg-gray-50/50" : "hover:bg-gray-50/30"}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.is_checked
                          ? "bg-[#2D6A4F] border-[#2D6A4F]"
                          : "border-gray-200"
                      }`}
                    >
                      {item.is_checked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm transition-all ${
                          item.is_checked
                            ? "text-gray-300 line-through"
                            : "text-gray-800 font-medium"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    {item.quantity && (
                      <span className={`text-xs flex-shrink-0 ${item.is_checked ? "text-gray-200" : "text-gray-400"}`}>
                        {item.quantity}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </PremiumGate>
    </div>
  );
}