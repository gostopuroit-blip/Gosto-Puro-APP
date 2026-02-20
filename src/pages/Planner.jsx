import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlannerModal from "@/components/PlannerModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CalendarDays, Plus, RefreshCw, Trash2, Clock, ShoppingCart, Loader2, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const dayNames = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function Planner() {
  const [plan, setPlan] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [plans, allRecipes] = await Promise.all([
      base44.entities.MealPlan.filter({ is_active: true }),
      base44.entities.Recipe.list("-numero_preparate", 100),
    ]);
    if (plans.length > 0) setPlan(plans[0]);
    setRecipes(allRecipes);
    setLoading(false);
  };

  const getRecipeById = (id) => recipes.find((r) => r.id === id);

  const createPlan = async ({ days, focus, maxTime, servings }) => {
    setCreating(true);
    setShowModal(false);

    // Filter eligible recipes
    let eligible = recipes.filter((r) => r.prep_time <= maxTime);

    if (focus === "leggero") {
      const lightFirst = eligible.filter(
        (r) => r.lifestyle && (r.lifestyle.includes("Low carb") || r.lifestyle.includes("Detox") || r.lifestyle.includes("Fitness"))
      );
      if (lightFirst.length >= days * 2) eligible = lightFirst;
    } else if (focus === "famiglia") {
      const familyFirst = eligible.filter(
        (r) => r.servings >= 4 || (r.occasions && r.occasions.includes("Pranzo in famiglia"))
      );
      if (familyFirst.length >= days * 2) eligible = familyFirst;
    }

    // Sort by preparate for social proof
    eligible.sort((a, b) => (b.numero_preparate || 0) - (a.numero_preparate || 0));

    // Distribute
    const planData = [];
    const used = new Set();

    for (let i = 0; i < days; i++) {
      const pranzo = eligible.find(
        (r) => !used.has(r.id) && (r.category === "Pranzo" || r.category === "Colazione" || r.category === "Snack" || true)
      );
      if (pranzo) used.add(pranzo.id);

      const cena = eligible.find((r) => !used.has(r.id));
      if (cena) used.add(cena.id);

      planData.push({
        day: i + 1,
        day_name: dayNames[i % 7],
        pranzo_id: pranzo?.id || "",
        pranzo_title: pranzo?.title || "",
        cena_id: cena?.id || "",
        cena_title: cena?.title || "",
      });
    }

    // Deactivate old plans
    const oldPlans = await base44.entities.MealPlan.filter({ is_active: true });
    for (const old of oldPlans) {
      await base44.entities.MealPlan.update(old.id, { is_active: false });
    }

    const newPlan = await base44.entities.MealPlan.create({
      name: `Piano ${days} giorni`,
      days,
      focus,
      max_time: maxTime,
      servings: servings || 2,
      plan_data: planData,
      is_active: true,
    });

    setPlan(newPlan);
    setCreating(false);
    toast.success("Piano creato! 🎉");
  };

  const swapRecipe = async (dayIndex, meal) => {
    if (!plan) return;
    const currentId = meal === "pranzo" ? plan.plan_data[dayIndex].pranzo_id : plan.plan_data[dayIndex].cena_id;
    const usedIds = plan.plan_data.flatMap((d) => [d.pranzo_id, d.cena_id]);
    const available = recipes.filter((r) => !usedIds.includes(r.id) && r.prep_time <= (plan.max_time || 30));
    
    if (available.length === 0) {
      toast.error("Nessuna ricetta disponibile");
      return;
    }

    const newRecipe = available[Math.floor(Math.random() * available.length)];
    const newPlanData = [...plan.plan_data];
    
    if (meal === "pranzo") {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], pranzo_id: newRecipe.id, pranzo_title: newRecipe.title };
    } else {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], cena_id: newRecipe.id, cena_title: newRecipe.title };
    }

    await base44.entities.MealPlan.update(plan.id, { plan_data: newPlanData });
    setPlan({ ...plan, plan_data: newPlanData });
    toast.success("Ricetta sostituita!");
  };

  const removeMeal = async (dayIndex, meal) => {
    if (!plan) return;
    const newPlanData = [...plan.plan_data];
    
    if (meal === "pranzo") {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], pranzo_id: "", pranzo_title: "" };
    } else {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], cena_id: "", cena_title: "" };
    }

    await base44.entities.MealPlan.update(plan.id, { plan_data: newPlanData });
    setPlan({ ...plan, plan_data: newPlanData });
  };

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
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Il mio Piano</h1>
            <p className="text-sm text-gray-400 mt-0.5">Pianifica i tuoi pasti</p>
          </div>
          <div className="flex gap-2">
            {plan && (
              <Link to={createPageUrl("ShoppingList")}>
                <Button size="sm" variant="outline" className="rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]"
            >
              <Plus className="w-4 h-4 mr-1" />
              {plan ? "Nuovo" : "Crea"}
            </Button>
          </div>
        </div>
      </div>

      {creating && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#2D6A4F] animate-spin mb-4" />
          <p className="text-sm text-gray-400">Creo il tuo piano perfetto...</p>
        </div>
      )}

      {!creating && !plan && (
        <div className="px-5 text-center py-20">
          <div className="w-20 h-20 bg-[#F0F7F4] rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-10 h-10 text-[#2D6A4F]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Crea il tuo primo piano</h2>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
            Genera un piano settimanale personalizzato in un solo click
          </p>
          <Button
            onClick={() => setShowModal(true)}
            className="rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] px-8 py-6 font-bold shadow-lg shadow-[#2D6A4F]/20"
          >
            ✨ Configura Piano
          </Button>
        </div>
      )}

      {!creating && plan && (
        <div className="px-5 space-y-4">
          {/* Plan info */}
          <div className="bg-[#F0F7F4] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2D6A4F] rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{plan.name}</p>
              <p className="text-xs text-gray-400">
                {plan.focus === "pratico" ? "⚡ Pratico" : plan.focus === "leggero" ? "🥗 Leggero" : "👨‍👩‍👧 Famiglia"}
                {" • ≤"}{plan.max_time} min
                {plan.servings && <span> • 👥 {plan.servings} {plan.servings === 1 ? "persona" : "persone"}</span>}
              </p>
            </div>
          </div>

          {/* Days */}
          {(plan.plan_data || []).map((day, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#2D6A4F] rounded-lg flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{day.day}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{day.day_name}</span>
              </div>

              {/* Pranzo */}
              <MealSlot
                label="Pranzo"
                emoji="☀️"
                recipeId={day.pranzo_id}
                recipeTitle={day.pranzo_title}
                recipe={getRecipeById(day.pranzo_id)}
                onSwap={() => swapRecipe(idx, "pranzo")}
                onRemove={() => removeMeal(idx, "pranzo")}
              />

              {/* Cena */}
              <MealSlot
                label="Cena"
                emoji="🌙"
                recipeId={day.cena_id}
                recipeTitle={day.cena_title}
                recipe={getRecipeById(day.cena_id)}
                onSwap={() => swapRecipe(idx, "cena")}
                onRemove={() => removeMeal(idx, "cena")}
              />
            </div>
          ))}

          {/* Generate Shopping List */}
          <Link to={createPageUrl("ShoppingList")}>
            <Button className="w-full py-6 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] font-bold shadow-lg shadow-[#2D6A4F]/20 mt-4">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Genera lista della spesa
            </Button>
          </Link>
        </div>
      )}

      <PlannerModal open={showModal} onClose={() => setShowModal(false)} onCreate={createPlan} />
    </div>
  );
}

function MealSlot({ label, emoji, recipeId, recipeTitle, recipe, onSwap, onRemove }) {
  if (!recipeId) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{emoji}</span>
          <div>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-xs text-gray-300 italic">Nessuna ricetta</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <Link
        to={createPageUrl(`RecipeDetail?id=${recipeId}`)}
        className="flex items-center gap-2.5 flex-1 min-w-0"
      >
        {recipe?.image_url && (
          <img src={recipe.image_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        )}
        {!recipe?.image_url && <span className="text-base">{emoji}</span>}
        <div className="min-w-0">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{recipeTitle}</p>
          {recipe && (
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-gray-300" />
              <span className="text-[10px] text-gray-300">{recipe.prep_time} min</span>
            </div>
          )}
        </div>
      </Link>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onSwap} className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button onClick={onRemove} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}