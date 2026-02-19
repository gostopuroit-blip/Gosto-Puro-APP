import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2, ShoppingCart, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const existingItems = await base44.entities.ShoppingItem.list("category", 200);
    if (existingItems.length > 0) {
      setItems(existingItems);
      setLoading(false);
    } else {
      await generateList();
    }
  };

  const generateList = async () => {
    setGenerating(true);
    
    // Get active plan
    const plans = await base44.entities.MealPlan.filter({ is_active: true });
    
    if (plans.length === 0) {
      setLoading(false);
      setGenerating(false);
      return;
    }

    const plan = plans[0];
    const recipeIds = plan.plan_data
      .flatMap((d) => [d.pranzo_id, d.cena_id])
      .filter(Boolean);

    // Get recipes
    const recipes = await base44.entities.Recipe.list("-created_date", 100);
    const planRecipes = recipes.filter((r) => recipeIds.includes(r.id));

    // Merge ingredients — sum numeric quantities, deduplicate by normalized name
    const merged = {};
    const parseQty = (str) => {
      if (!str) return { num: 0, unit: "" };
      const match = String(str).match(/^([\d.,]+)\s*(.*)/);
      if (match) return { num: parseFloat(match[1].replace(",", ".")), unit: match[2].trim() };
      return { num: 0, unit: str.trim() };
    };

    for (const recipe of planRecipes) {
      for (const ing of (recipe.ingredients || [])) {
        const key = ing.name.toLowerCase().trim().replace(/[aeiou]$/, ""); // naive stem for it
        if (merged[key]) {
          const existing = parseQty(merged[key].rawQty);
          const incoming = parseQty(ing.quantity);
          if (existing.num > 0 && incoming.num > 0 && existing.unit === incoming.unit) {
            const total = existing.num + incoming.num;
            merged[key].rawQty = `${Number.isInteger(total) ? total : total.toFixed(1)} ${existing.unit}`.trim();
          } else if (existing.num > 0 && incoming.num > 0) {
            merged[key].rawQty = `${existing.num} ${existing.unit} + ${incoming.num} ${incoming.unit}`.trim();
          } else {
            merged[key].rawQty = [merged[key].rawQty, ing.quantity].filter(Boolean).join(" + ");
          }
          merged[key].count = (merged[key].count || 1) + 1;
        } else {
          merged[key] = {
            name: ing.name,
            rawQty: ing.quantity || "",
            category: ing.category || "Altro",
            count: 1,
          };
        }
      }
    }

    // Delete old items
    const oldItems = await base44.entities.ShoppingItem.list("category", 200);
    for (const item of oldItems) {
      await base44.entities.ShoppingItem.delete(item.id);
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

    const created = await base44.entities.ShoppingItem.list("category", 200);
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
    for (const item of checked) {
      await base44.entities.ShoppingItem.delete(item.id);
    }
    setItems((prev) => prev.filter((i) => !i.is_checked));
    toast.success("Elementi completati rimossi");
  };

  const groupedItems = categoryOrder.reduce((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  const checkedCount = items.filter((i) => i.is_checked).length;
  const totalCount = items.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
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
            <Button
              size="sm"
              onClick={generateList}
              disabled={generating}
              className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
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
  );
}