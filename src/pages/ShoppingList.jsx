import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CATEGORIES = {
  "Ortofrutta": "🥬",
  "Carne e pesce": "🍗",
  "Latticini": "🧈",
  "Dispensa": "🥫",
  "Surgelati": "❄️",
  "Altro": "🛍️"
};

const CATEGORY_ORDER = ["Ortofrutta", "Carne e pesce", "Latticini", "Dispensa", "Surgelati", "Altro"];

export default function ShoppingList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [updatingList, setUpdatingList] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const mealPlanId = params.get("meal_plan_id");

  useEffect(() => {
    loadData();
  }, [mealPlanId]);

  const loadData = async () => {
    if (!mealPlanId) return;

    const [planData, shoppingItems] = await Promise.all([
      base44.entities.MealPlan.filter({ id: mealPlanId }),
      base44.entities.ShoppingItem.filter({ meal_plan_id: mealPlanId })
    ]);

    if (planData.length > 0) {
      setPlan(planData[0]);
    }
    setItems(shoppingItems);
    setLoading(false);
  };

  const toggleItem = async (itemId, currentChecked) => {
    const newChecked = !currentChecked;
    setItems(items.map(item => 
      item.id === itemId ? { ...item, is_checked: newChecked } : item
    ));
    
    await base44.entities.ShoppingItem.update(itemId, { is_checked: newChecked });
  };

  const updateShoppingList = async () => {
    if (!plan) return;
    
    setUpdatingList(true);
    
    try {
      // Collect all unique recipe IDs from ALL days
      const recipeIdSet = new Set();
      for (const day of plan.plan_data || []) {
        [day.colazione_id, day.pranzo_id, day.snack_id, day.cena_id]
          .filter(Boolean)
          .forEach(id => recipeIdSet.add(id));
      }

      // Fetch all unique recipes in parallel
      const recipeResults = await Promise.all(
        [...recipeIdSet].map(id => base44.entities.Recipe.filter({ id }))
      );

      // Aggregate ingredients — group by name (case-insensitive)
      const allIngredients = {};
      for (const results of recipeResults) {
        if (results.length === 0) continue;
        const recipe = results[0];
        for (const ing of recipe.ingredients || []) {
          const key = ing.name.toLowerCase().trim();
          if (!allIngredients[key]) {
            allIngredients[key] = {
              name: ing.name,
              quantities: [],
              category: ing.category || "Altro"
            };
          }
          if (ing.quantity) allIngredients[key].quantities.push(ing.quantity);
        }
      }

      // Delete old items
      const oldItems = await base44.entities.ShoppingItem.filter({ meal_plan_id: plan.id });
      await Promise.all(oldItems.map(item => base44.entities.ShoppingItem.delete(item.id)));

      // Merge quantities intelligently
      const mergeQuantities = (quantities) => {
        if (!quantities || quantities.length === 0) return "";

        // Remove duplicates first
        const unique = [...new Set(quantities.map(q => q.trim()))];

        // Filter out "q.b." entries if there are numeric quantities too
        const nonQb = unique.filter(q => !/^q\.?b\.?$/i.test(q));
        const onlyQb = nonQb.length === 0;
        if (onlyQb) return "q.b.";

        // Try to parse each as number + unit
        // Matches: "500g", "1.5 kg", "200 ml", "3", "2 L", "100 G"
        const UNIT_REGEX = /^([\d.,]+)\s*(g|kg|ml|l|gr|cl|dl)?$/i;

        const parsed = nonQb.map(q => {
          const m = q.match(UNIT_REGEX);
          if (m) {
            const num = parseFloat(m[1].replace(",", "."));
            const unit = m[2] ? m[2].toLowerCase() : "";
            // Normalize units: gr→g, cl→g-scale not needed, just keep as-is
            return { num, unit, original: q };
          }
          return { num: null, unit: null, original: q };
        });

        // Group by unit
        const byUnit = {};
        const unparsed = [];
        for (const p of parsed) {
          if (p.num !== null) {
            const u = p.unit || "";
            if (!byUnit[u]) byUnit[u] = 0;
            byUnit[u] += p.num;
          } else {
            unparsed.push(p.original);
          }
        }

        const parts = [];

        // Format numeric totals
        for (const [unit, total] of Object.entries(byUnit)) {
          const formatted = Number.isInteger(total) ? String(total) : total.toFixed(1).replace(".0", "");
          parts.push(formatted + unit);
        }

        // Add unparsed parts (e.g. "1 media", "2 medie") — try to count total
        if (unparsed.length > 0) {
          // Try to sum simple numeric-only entries among unparsed
          const numericUnparsed = unparsed.map(u => {
            const m = u.match(/^([\d.,]+)(.*)$/);
            if (m) return { num: parseFloat(m[1].replace(",", ".")), suffix: m[2].trim() };
            return null;
          });

          if (numericUnparsed.every(x => x !== null)) {
            const totalNum = numericUnparsed.reduce((s, x) => s + x.num, 0);
            const suffix = numericUnparsed[0].suffix || "";
            const formatted = Number.isInteger(totalNum) ? String(totalNum) : totalNum.toFixed(1);
            parts.push((formatted + (suffix ? " " + suffix : "")).trim());
          } else {
            // Mix of parseable and not — just join unparsed
            parts.push(...unparsed);
          }
        }

        return parts.join(" + ");
      };

      const newItems = Object.values(allIngredients).map(ing => ({
        name: ing.name,
        quantity: mergeQuantities(ing.quantities),
        category: ing.category,
        is_checked: false,
        meal_plan_id: plan.id
      }));

      if (newItems.length > 0) {
        await base44.entities.ShoppingItem.bulkCreate(newItems);
      }

      await loadData();
      toast.success("Lista aggiornata! ✓");
    } catch (error) {
      toast.error("Errore nell'aggiornamento della lista");
      console.error(error);
    }
    
    setUpdatingList(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  const groupedItems = {};
  items.forEach(item => {
    const cat = item.category || "Altro";
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const filteredCategories = selectedCategory === "Tutti" 
    ? CATEGORY_ORDER.filter(cat => groupedItems[cat])
    : [selectedCategory].filter(cat => groupedItems[cat]);

  const checkedCount = items.filter(item => item.is_checked).length;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-white dark:bg-[#0F0F0F] z-40 border-b border-gray-100 dark:border-[#2A2A2A]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Lista della spesa</h1>
          {plan && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {plan.name}
            </p>
          )}
        </div>
        <Button
          onClick={updateShoppingList}
          disabled={updatingList}
          size="icon"
          variant="ghost"
          className="rounded-lg"
        >
          <RotateCcw className={`w-5 h-5 ${updatingList ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Category filter */}
      <div className="px-5 py-3 sticky top-16 bg-white dark:bg-[#0F0F0F] z-40 border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {["Tutti", ...CATEGORY_ORDER].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-[#2D6A4F] text-white"
                  : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333333]"
              }`}
            >
              {cat === "Tutti" ? "Tutti" : `${CATEGORIES[cat]} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* Shopping items */}
      <div className="px-5 py-4">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-gray-400 text-sm">Nessun ingrediente</p>
            <Button
              onClick={updateShoppingList}
              disabled={updatingList}
              className="bg-[#2D6A4F] hover:bg-[#235c43] text-white text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Aggiorna lista
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCategories.map(category => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-[#2A2A2A]">
                  <span className="text-lg">{CATEGORIES[category]}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{category}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {groupedItems[category].length} {groupedItems[category].length === 1 ? "articolo" : "articoli"}
                  </span>
                </div>

                <div className="space-y-2">
                  {groupedItems[category].map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 dark:border-[#2A2A2A] transition-all ${
                        item.is_checked
                          ? "bg-green-50 dark:bg-green-900/10 opacity-60"
                          : "bg-white dark:bg-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-[#222222]"
                      }`}
                    >
                      <button
                        onClick={() => toggleItem(item.id, item.is_checked)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          item.is_checked
                            ? "bg-green-500 border-green-500"
                            : "border-gray-300 dark:border-[#444444] hover:border-[#2D6A4F] dark:hover:border-[#40916C]"
                        }`}
                      >
                        {item.is_checked && (
                          <span className="text-white text-xs font-bold">✓</span>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium transition-all ${
                          item.is_checked
                            ? "line-through text-gray-400 dark:text-gray-500"
                            : "text-gray-900 dark:text-white"
                        }`}>
                          {item.name}
                        </p>
                      </div>

                      {item.quantity && (
                        <span className={`text-xs font-semibold flex-shrink-0 transition-all ${
                          item.is_checked
                            ? "text-gray-300 dark:text-gray-600"
                            : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {item.quantity}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0F0F0F] border-t border-gray-100 dark:border-[#2A2A2A] px-5 py-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {checkedCount} di {items.length} ingredienti aggiunti al carrello
          </p>
        </div>
        <Button
          onClick={updateShoppingList}
          disabled={updatingList}
          className="w-full bg-[#2D6A4F] hover:bg-[#235c43] text-white py-5 rounded-xl"
        >
          <RotateCcw className={`w-4 h-4 mr-2 ${updatingList ? "animate-spin" : ""}`} />
          Aggiorna lista
        </Button>
      </div>
    </div>
  );
}