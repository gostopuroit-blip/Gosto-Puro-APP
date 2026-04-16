import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Check, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ChangeRecipeModal from "@/components/planner/ChangeRecipeModal";
import PlannerModal from "@/components/PlannerModal";

const MEAL_TIMES = {
  colazione: "07:00",
  pranzo: "12:30",
  snack: "16:00",
  cena: "20:00"
};

const MEAL_LABELS = {
  colazione: "Colazione",
  pranzo: "Pranzo",
  snack: "Snack",
  cena: "Cena"
};

const DAYS_WEEK = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function Planner() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [recipes, setRecipes] = useState({});
  const [weekStartDay, setWeekStartDay] = useState(0);
  const [user, setUser] = useState(null);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [changeRecipeSlot, setChangeRecipeSlot] = useState(null); // { mealType }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const currentUser = await base44.auth.me().catch(() => null);
    setUser(currentUser);

    const plans = await base44.entities.MealPlan.filter(
      { is_active: true, created_by: currentUser?.email },
      "-created_date",
      1
    );

    if (plans.length > 0) {
      const activePlan = plans[0];
      setPlan(activePlan);
      setSelectedDay(0);
      setWeekStartDay(0);

      // Fetch all recipes
      const recipeIds = new Set();
      activePlan.plan_data?.forEach(day => {
        if (day.colazione_id) recipeIds.add(day.colazione_id);
        if (day.pranzo_id) recipeIds.add(day.pranzo_id);
        if (day.snack_id) recipeIds.add(day.snack_id);
        if (day.cena_id) recipeIds.add(day.cena_id);
      });

      const fetchedRecipes = {};
      for (const id of recipeIds) {
        const r = await base44.entities.Recipe.filter({ id });
        if (r.length > 0) fetchedRecipes[id] = r[0];
      }
      setRecipes(fetchedRecipes);
    }
    setLoading(false);
  };

  const handleCreatePlan = async ({ days, focus, maxTime, servings, dietaryTags }) => {
    setIsCreating(true);
    try {
      // Fetch published recipes
      let allRecipes = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", 200, skip);
        allRecipes = allRecipes.concat(batch);
        if (batch.length < 200) break;
        skip += 200;
      }

      // Filter by max time
      const withinTime = allRecipes.filter(r => !r.prep_time || r.prep_time <= maxTime);
      const fallback = allRecipes; // use all if filtered pool is too small

      // Helper: pick a random recipe matching category, prefer dietary tags
      const pickRecipe = (category, exclude = [], usedIds = new Set()) => {
        const pool = (withinTime.length > 10 ? withinTime : fallback)
          .filter(r => r.category === category && !usedIds.has(r.id));

        if (pool.length === 0) return null;

        // Prefer recipes matching dietary tags
        if (dietaryTags && dietaryTags.length > 0) {
          const preferred = pool.filter(r =>
            (r.dietary_tags || []).some(tag => dietaryTags.includes(tag))
          );
          if (preferred.length > 0) {
            return preferred[Math.floor(Math.random() * preferred.length)];
          }
        }

        return pool[Math.floor(Math.random() * pool.length)];
      };

      const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
      const usedPerCategory = { Colazione: new Set(), Pranzo: new Set(), Snack: new Set(), Cena: new Set() };

      const plan_data = Array.from({ length: days }, (_, i) => {
        const colazione = pickRecipe("Colazione", [], usedPerCategory["Colazione"]);
        if (colazione) usedPerCategory["Colazione"].add(colazione.id);
        const pranzo = pickRecipe("Pranzo", [], usedPerCategory["Pranzo"]);
        if (pranzo) usedPerCategory["Pranzo"].add(pranzo.id);
        const snack = pickRecipe("Snack", [], usedPerCategory["Snack"]);
        if (snack) usedPerCategory["Snack"].add(snack.id);
        const cena = pickRecipe("Cena", [], usedPerCategory["Cena"]);
        if (cena) usedPerCategory["Cena"].add(cena.id);

        return {
          day: i + 1,
          day_name: DAY_NAMES[i % 7],
          colazione_id: colazione?.id || null,
          colazione_title: colazione?.title || null,
          colazione_time: "07:00",
          pranzo_id: pranzo?.id || null,
          pranzo_title: pranzo?.title || null,
          pranzo_servings: servings,
          pranzo_time: "12:30",
          snack_id: snack?.id || null,
          snack_title: snack?.title || null,
          snack_servings: servings,
          snack_time: "16:00",
          cena_id: cena?.id || null,
          cena_title: cena?.title || null,
          cena_servings: servings,
          cena_time: "20:00",
          meals_done: [],
        };
      });

      // Deactivate previous plans
      const existingPlans = await base44.entities.MealPlan.filter({ is_active: true, created_by: user?.email });
      await Promise.all(existingPlans.map(p => base44.entities.MealPlan.update(p.id, { is_active: false })));

      // Create new plan
      const focusLabels = { pratico: "Pratico", leggero: "Leggero", famiglia: "Famiglia" };
      await base44.entities.MealPlan.create({
        name: `Piano ${focusLabels[focus] || focus} – ${days} giorni`,
        days,
        focus,
        max_time: maxTime,
        servings,
        plan_data,
        is_active: true,
        days_completed: [],
      });

      setShowPlannerModal(false);
      toast.success("Piano creato con successo! ✓");
      setLoading(true);
      await loadData();
    } catch (err) {
      toast.error("Errore nella creazione del piano");
      console.error(err);
    }
    setIsCreating(false);
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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-5">
        <p className="text-gray-400 text-center">Nessun piano attivo. Crea il tuo primo piano!</p>
        <Button
          onClick={() => setShowPlannerModal(true)}
          className="bg-[#2D6A4F] hover:bg-[#235c43] text-white"
        >
          Genera nuovo planner
        </Button>
        {showPlannerModal && (
          <PlannerModal
            onCreate={handleCreatePlan}
            onClose={() => setShowPlannerModal(false)}
            isLoading={isCreating}
          />
        )}
      </div>
    );
  }

  const currentDay = plan.plan_data[selectedDay];
  if (!currentDay) return null;

  const weekEnd = Math.min(weekStartDay + 7, plan.days);
  const weekDays = plan.plan_data.slice(weekStartDay, weekEnd);

  // Calcular macros do dia
  const macros = (() => {
    const m = { proteina: 0, carboidrati: 0, grassi: 0, fibre: 0, calorie: 0 };
    const mealIds = [currentDay.colazione_id, currentDay.pranzo_id, currentDay.snack_id, currentDay.cena_id];
    mealIds.forEach(id => {
      if (!id) return;
      const r = recipes[id];
      if (!r) return;
      m.proteina += Number(r.proteine) || 0;
      m.carboidrati += Number(r.carboidrati) || 0;
      m.grassi += Number(r.grassi) || 0;
      m.fibre += Number(r.fibre) || 0;
      m.calorie += Number(r.calorie) || Number(r.calories) || 0;
    });
    return m;
  })();

  // Toggle meal completion
  const toggleMealDone = async (mealType) => {
    const updatedPlan = { ...plan };
    const dayData = updatedPlan.plan_data[selectedDay];
    
    if (!dayData.meals_done) dayData.meals_done = [];

    if (dayData.meals_done.includes(mealType)) {
      dayData.meals_done = dayData.meals_done.filter(m => m !== mealType);
    } else {
      dayData.meals_done.push(mealType);
    }

    // Atualizar days_completed se todos os 4 completos
    if (dayData.meals_done.length === 4) {
      if (!updatedPlan.days_completed) updatedPlan.days_completed = [];
      if (!updatedPlan.days_completed.includes(selectedDay)) {
        updatedPlan.days_completed.push(selectedDay);
      }
    } else {
      updatedPlan.days_completed = (updatedPlan.days_completed || []).filter(d => d !== selectedDay);
    }

    setPlan(updatedPlan);
    
    // Save async
    await base44.entities.MealPlan.update(plan.id, {
      plan_data: updatedPlan.plan_data,
      days_completed: updatedPlan.days_completed
    });
  };

  const isMealDone = (mealType) => (currentDay.meals_done || []).includes(mealType);

  const swapRecipe = async (recipe) => {
    const mealType = changeRecipeSlot?.mealType;
    if (!mealType || !plan) return;

    const updatedPlan = { ...plan, plan_data: plan.plan_data.map((d, i) => {
      if (i !== selectedDay) return d;
      return {
        ...d,
        [`${mealType}_id`]: recipe.id,
        [`${mealType}_title`]: recipe.title
      };
    })};

    setPlan(updatedPlan);
    setRecipes(prev => ({ ...prev, [recipe.id]: recipe }));
    await base44.entities.MealPlan.update(plan.id, { plan_data: updatedPlan.plan_data });
    toast.success("Ricetta aggiornata! ✓");
    setChangeRecipeSlot(null);
  };

  const dayProgressPercent = Math.round(((selectedDay + 1) / plan.days) * 100);
  const daysCompletedCount = (plan.days_completed || []).length;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Planner di {plan.days} giorni</h1>
          {plan.goal && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Meta: {plan.goal} {plan.daily_kcal ? `· ${plan.daily_kcal} kcal/giorno` : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(createPageUrl("WhatToCook"))}
          className="px-3 py-1.5 text-sm font-semibold text-[#2D6A4F] dark:text-[#40916C] hover:bg-[#2D6A4F]/5 rounded-lg transition-colors"
        >
          Personalizza ↗
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Giorno {selectedDay + 1} di {plan.days}
          </span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            {daysCompletedCount} completati
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-[#2A2A2A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2D6A4F] transition-all duration-300"
            style={{ width: `${dayProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Days of week navigation */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2">
          {weekStartDay > 0 && (
            <button
              onClick={() => setWeekStartDay(Math.max(0, weekStartDay - 7))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex gap-1.5 flex-1">
            {weekDays.map((day, idx) => {
              const dayNum = weekStartDay + idx;
              const isSelected = selectedDay === dayNum;
              const isCompleted = (plan.days_completed || []).includes(dayNum);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg flex-1 transition-all ${
                    isSelected
                      ? "bg-[#2D6A4F] text-white"
                      : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333333]"
                  }`}
                >
                  <span className="text-xs font-semibold">{DAYS_WEEK[day.day_name ? (["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].indexOf(day.day_name)) : (dayNum % 7)]}</span>
                  <span className="text-sm font-bold">{dayNum + 1}</span>
                  {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </button>
              );
            })}
          </div>

          {weekEnd < plan.days && (
            <button
              onClick={() => setWeekStartDay(weekStartDay + 7)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Macros */}
      <div className="px-5 mb-6">
        <div className="flex gap-2 flex-wrap">
          <div className="bg-[#2D6A4F]/10 text-[#2D6A4F] dark:bg-[#2D6A4F]/20 dark:text-[#40916C] px-3 py-1.5 rounded-full text-xs font-semibold">
            {Math.round(macros.proteina)}g Proteína
          </div>
          <div className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold">
            {Math.round(macros.carboidrati)}g Carbs
          </div>
          <div className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-3 py-1.5 rounded-full text-xs font-semibold">
            {Math.round(macros.grassi)}g Grassi
          </div>
          <div className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-full text-xs font-semibold">
            {Math.round(macros.fibre)}g Fibre
          </div>
        </div>
        <div className="text-right text-sm font-bold text-gray-700 dark:text-gray-300 mt-2">
          {Math.round(macros.calorie)} kcal
        </div>
      </div>

      {/* Meals */}
      <div className="px-5 space-y-4">
        {["colazione", "pranzo", "snack", "cena"].map(mealType => {
          const mealKey = `${mealType}_id`;
          const mealTitleKey = `${mealType}_title`;
          const mealTimeKey = `${mealType}_time`;
          const mealServingsKey = `${mealType}_servings`;

          const mealId = currentDay[mealKey];
          const mealTitle = currentDay[mealTitleKey];
          const mealTime = currentDay[mealTimeKey] || MEAL_TIMES[mealType];
          const mealServings = currentDay[mealServingsKey];
          const recipe = mealId ? recipes[mealId] : null;
          const isDone = isMealDone(mealType);

          if (!mealId && mealType === "snack") {
            return (
              <div key={mealType} className="border-2 border-dashed border-gray-200 dark:border-[#333333] rounded-xl p-4 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Aggiungi uno snack</span>
              </div>
            );
          }

          if (!mealId) return null;

          return (
            <div key={mealType}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {MEAL_LABELS[mealType]} · {mealTime}
                </span>
                {recipe && (
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {Math.round(recipe.calorie || recipe.calories || 0)} kcal
                  </span>
                )}
              </div>

              <div
                className={`bg-white dark:bg-[#1A1A1A] rounded-xl p-3 border border-gray-100 dark:border-[#2A2A2A] flex items-center gap-3 ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                {recipe?.image_url && (
                  <img
                    src={recipe.image_url}
                    alt={mealTitle}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${isDone ? "line-through text-gray-400" : ""}`}>
                      {mealTitle}
                    </p>
                    {recipe && (user?.dietary_tags_profile || []).length > 0 &&
                      (recipe.dietary_tags || []).some(tag => (user.dietary_tags_profile || []).includes(tag)) && (
                      <span className="flex-shrink-0 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                        ✓ Per te
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {recipe?.prep_time ? `⏱ ${recipe.prep_time} min` : ""}
                    {recipe?.proteine ? ` · ${Math.round(recipe.proteine)}g proteína` : ""}
                  </p>
                </div>

                <button
                  onClick={() => setChangeRecipeSlot({ mealType })}
                  className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-200 dark:border-[#444444] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </button>

                <button
                  onClick={() => toggleMealDone(mealType)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    isDone
                      ? "bg-green-500 border-green-500"
                      : "border-gray-300 dark:border-[#444444] hover:border-[#2D6A4F] dark:hover:border-[#40916C]"
                  }`}
                >
                  {isDone && <Check className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shopping list button */}
      <div className="px-5 mb-4">
        <Button
          onClick={() => navigate(`/ShoppingList?meal_plan_id=${plan.id}`)}
          variant="outline"
          className="w-full py-6 rounded-2xl border-2 font-semibold text-sm"
        >
          🛒 Lista della spesa
        </Button>
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-24 left-0 right-0 px-5 max-w-lg mx-auto">
        <Button
          onClick={() => setShowPlannerModal(true)}
          className="w-full bg-[#2D6A4F] hover:bg-[#235c43] text-white rounded-xl py-6"
        >
          Genera nuovo planner
        </Button>
      </div>

      {showPlannerModal && (
        <PlannerModal
          onCreate={handleCreatePlan}
          onClose={() => setShowPlannerModal(false)}
          isLoading={isCreating}
        />
      )}

      <ChangeRecipeModal
        open={!!changeRecipeSlot}
        onOpenChange={(v) => !v && setChangeRecipeSlot(null)}
        mealType={changeRecipeSlot?.mealType}
        onSelect={swapRecipe}
      />
    </div>
  );
}