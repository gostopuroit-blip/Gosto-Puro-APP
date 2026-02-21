import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlannerModal from "@/components/PlannerModal";
import PremiumGate from "@/components/PremiumGate";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CalendarDays, Plus, RefreshCw, Trash2, Clock, ChefHat, ShoppingCart, Loader2, Search, X, Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const dayNames = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function Planner() {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [userRecipes, setUserRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null); // { dayIndex, meal }
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const currentUser = await base44.auth.me().catch(() => null);
    setUser(currentUser);
    const [plans, allRecipes, allFolders, allUserRecipes] = await Promise.all([
      base44.entities.MealPlan.filter({ is_active: true }),
      base44.entities.Recipe.list("-numero_preparate", 100),
      base44.entities.Folder.list(),
      base44.entities.UserRecipe.list(),
    ]);
    if (plans.length > 0) setPlan(plans[0]);
    setRecipes(allRecipes);
    setFolders(allFolders);
    setUserRecipes(allUserRecipes);
    setLoading(false);
  };

  const getRecipeById = (id) => recipes.find((r) => r.id === id);

  const createPlan = async ({ days, focus, maxTime, servings }) => {
    setCreating(true);
    setShowModal(false);

    // Filter recipes by category and time
    const filterByCategory = (category) => {
      let eligible = recipes.filter((r) => r.category === category && r.prep_time <= maxTime);

      if (focus === "leggero") {
        const lightFirst = eligible.filter(
          (r) => r.lifestyle && (r.lifestyle.includes("Low carb") || r.lifestyle.includes("Detox") || r.lifestyle.includes("Fitness"))
        );
        if (lightFirst.length > 0) eligible = lightFirst;
      } else if (focus === "famiglia") {
        const familyFirst = eligible.filter(
          (r) => r.servings >= 4 || (r.occasions && r.occasions.includes("Pranzo in famiglia"))
        );
        if (familyFirst.length > 0) eligible = familyFirst;
      }

      eligible.sort((a, b) => (b.numero_preparate || 0) - (a.numero_preparate || 0));
      return eligible;
    };

    const colazioniPool = filterByCategory("Colazione");
    const pranziPool = filterByCategory("Pranzo");
    const cenePool = filterByCategory("Cena");

    // Distribute
    const planData = [];
    const usedColazioni = new Set();
    const usedPranzi = new Set();
    const usedCene = new Set();

    for (let i = 0; i < days; i++) {
      const colazioneRecipe = colazioniPool.find((r) => !usedColazioni.has(r.id));
      const pranzoRecipe = pranziPool.find((r) => !usedPranzi.has(r.id));
      const cenaRecipe = cenePool.find((r) => !usedCene.has(r.id));

      if (colazioneRecipe) usedColazioni.add(colazioneRecipe.id);
      if (pranzoRecipe) usedPranzi.add(pranzoRecipe.id);
      if (cenaRecipe) usedCene.add(cenaRecipe.id);

      const dayOfWeek = (new Date().getDay() + i) % 7;
      planData.push({
        day: i + 1,
        day_name: dayNames[dayOfWeek],
        colazione_id: colazioneRecipe?.id || "",
        colazione_title: colazioneRecipe?.title || "",
        pranzo_id: pranzoRecipe?.id || "",
        pranzo_title: pranzoRecipe?.title || "",
        pranzo_servings: servings,
        cena_id: cenaRecipe?.id || "",
        cena_title: cenaRecipe?.title || "",
        cena_servings: servings,
      });
    }

    const newPlan = {
      name: `Piano ${focus}`,
      days,
      focus,
      max_time: maxTime,
      servings,
      plan_data: planData,
      is_active: true,
    };

    // Deactivate old plans
    if (plan) {
      await base44.entities.MealPlan.update(plan.id, { is_active: false });
    }

    const created = await base44.entities.MealPlan.create(newPlan);
    setPlan(created);
    setCreating(false);
    toast.success("Piano creato!");
  };

  const replaceWithRecipe = async (recipe) => {
    if (!replaceTarget || !plan) return;
    const { dayIndex, meal } = replaceTarget;
    const newPlanData = [...plan.plan_data];
    if (meal === "colazione") {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], colazione_id: recipe.id, colazione_title: recipe.title };
    } else if (meal === "pranzo") {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], pranzo_id: recipe.id, pranzo_title: recipe.title };
    } else {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], cena_id: recipe.id, cena_title: recipe.title };
    }
    await base44.entities.MealPlan.update(plan.id, { plan_data: newPlanData });
    setPlan({ ...plan, plan_data: newPlanData });
    setReplaceTarget(null);
    setSearchQuery("");
    toast.success("Ricetta sostituita!");
  };



  const removeMeal = async (dayIndex, meal) => {
    if (!plan) return;
    const newPlanData = [...plan.plan_data];
    
    if (meal === "colazione") {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], colazione_id: "", colazione_title: "" };
    } else if (meal === "pranzo") {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], pranzo_id: "", pranzo_title: "" };
    } else {
      newPlanData[dayIndex] = { ...newPlanData[dayIndex], cena_id: "", cena_title: "" };
    }
    await base44.entities.MealPlan.update(plan.id, { plan_data: newPlanData });
    setPlan({ ...plan, plan_data: newPlanData });
    toast.success("Ricetta rimossa!");
  };

  const clearAllMeals = async () => {
    if (!plan) return;
    const newPlanData = plan.plan_data.map((day) => ({
      ...day,
      colazione_id: "",
      colazione_title: "",
      pranzo_id: "",
      pranzo_title: "",
      pranzo_servings: day.pranzo_servings,
      cena_id: "",
      cena_title: "",
      cena_servings: day.cena_servings,
    }));
    await base44.entities.MealPlan.update(plan.id, { plan_data: newPlanData });
    setPlan({ ...plan, plan_data: newPlanData });
    toast.success("Ricette eliminate");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  const isPremium = user?.plan === "premium" || user?.role === "admin";

  return (
    <div className="pb-4">
      {!isPremium && (
        <div className="fixed inset-0 flex items-center justify-center z-20 bg-white/60 backdrop-blur-sm">
          <PremiumGate user={user} feature="il Pianificatore Pasti">
            <div />
          </PremiumGate>
        </div>
      )}
      <div className={!isPremium ? "pointer-events-none opacity-20 select-none" : ""}>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Il mio Piano</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Pianifica i tuoi pasti</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]"
              onClick={() => setShowModal(true)}
            >
              <Plus className="w-4 h-4" />
              {plan ? "Nuovo piano" : "Crea piano"}
            </Button>
            {plan && (
              <>
                <Link to={createPageUrl("ShoppingList")}>
                  <Button size="sm" variant="outline" className="rounded-xl dark:bg-[#2D3F35] dark:border-[#3D5246] gap-1.5 w-full">
                    <ShoppingCart className="w-4 h-4" />
                    Lista della Spesa
                  </Button>
                </Link>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearAllMeals}
                    className="rounded-xl text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20 dark:text-red-400"
                    title="Elimina tutte le ricette"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      base44.entities.MealPlan.delete(plan.id);
                      setPlan(null);
                      toast.success("Piano eliminato");
                    }}
                    className="rounded-xl text-red-600 border-red-300 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20 dark:text-red-400"
                    title="Elimina piano"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Plan Grid */}
      <div className="px-5 space-y-4 mt-4">
        {plan ? (
          plan.plan_data.map((day, dayIndex) => (
            <div key={dayIndex} className="bg-white dark:bg-[#2D3F35] border border-gray-100 dark:border-[#3D5246] rounded-3xl p-4">
              {/* Day Header */}
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-5 h-5 text-[#2D6A4F]" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{day.day_name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Giorno {day.day}</p>
                </div>
              </div>

              {/* Meals Grid */}
              <div className="space-y-3">
                {["colazione", "pranzo", "cena"].map((meal) => {
                  const recipeId = day[`${meal}_id`];
                  const title = day[`${meal}_title`];
                  const recipe = recipeId ? getRecipeById(recipeId) : null;
                  const mealLabels = { colazione: "🥐 Colazione", pranzo: "🍽️ Pranzo", cena: "🍴 Cena" };

                  return (
                    <div
                      key={meal}
                      onClick={() => setReplaceTarget({ dayIndex, meal })}
                      className={`rounded-2xl border-2 cursor-pointer transition-all overflow-hidden ${
                        replaceTarget?.meal === meal && replaceTarget?.dayIndex === dayIndex
                          ? "border-[#2D6A4F] bg-[#F0F7F4] dark:bg-[#1A2B20]"
                          : "border-gray-100 dark:border-[#3D5246] bg-gray-50 dark:bg-[#1A2B20] hover:border-[#2D6A4F]/30"
                      }`}
                    >
                      {recipe && recipe.image_url && (
                        <div className="relative h-32 bg-gradient-to-t from-black/40 to-transparent overflow-hidden group">
                          <img 
                            src={recipe.image_url} 
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{mealLabels[meal]}</p>
                          <p className={`text-sm font-semibold ${title ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                            {title || "Nessuna ricetta"}
                          </p>
                          {recipe && recipe.prep_time && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <Clock className="w-3 h-3" />
                              {recipe.prep_time}min
                            </div>
                          )}
                        </div>
                        {recipe && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMeal(dayIndex, meal);
                            }}
                            className="text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition ml-2 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-gray-500 dark:text-gray-400 font-semibold mb-4">Nessun piano attivo</p>
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className="bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl"
            >
              Crea il tuo primo piano
            </Button>
          </div>
        )}
      </div>

      {/* Planner Modal */}
      {showModal && <PlannerModal onCreate={createPlan} onClose={() => setShowModal(false)} isLoading={creating} />}
      </div>

      {/* Replace Recipe Search */}
      {replaceTarget && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-end z-50">
          <div className="w-full bg-white dark:bg-[#2D3F35] rounded-t-3xl p-4 max-h-96 flex flex-col border-t border-gray-100 dark:border-[#3D5246]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Scegli ricetta</h3>
              <button onClick={() => setReplaceTarget(null)} className="text-gray-400 dark:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
              <input
                type="text"
                placeholder="Cerca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-[#3D5246] dark:bg-[#1A2B20] dark:text-white text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {recipes
                .filter((r) =>
                  r.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                  (r.category === "Colazione" || r.category === "Pranzo" || r.category === "Cena")
                )
                .map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => replaceWithRecipe(recipe)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-[#1A2B20] hover:bg-gray-100 dark:hover:bg-[#2D3F35] text-left transition border border-gray-100 dark:border-[#3D5246]"
                  >
                    <img src={recipe.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{recipe.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {recipe.prep_time}min
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}