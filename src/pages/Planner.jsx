import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlannerModal from "@/components/PlannerModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CalendarDays, Plus, RefreshCw, Trash2, Clock, ChefHat, ShoppingCart, Loader2, Search, X, Trash
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
  const [replaceTarget, setReplaceTarget] = useState(null); // { dayIndex, meal }
  const [searchQuery, setSearchQuery] = useState("");

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
      const availColazioni = colazioniPool.filter((r) => !usedColazioni.has(r.id));
      const colazione = availColazioni.length > 0
        ? availColazioni[Math.floor(Math.random() * availColazioni.length)]
        : null;
      if (colazione) usedColazioni.add(colazione.id);

      const availPranzi = pranziPool.filter((r) => !usedPranzi.has(r.id));
      const pranzo = availPranzi.length > 0
        ? availPranzi[Math.floor(Math.random() * availPranzi.length)]
        : null;
      if (pranzo) usedPranzi.add(pranzo.id);

      const availCene = cenePool.filter((r) => !usedCene.has(r.id));
      const cena = availCene.length > 0
        ? availCene[Math.floor(Math.random() * availCene.length)]
        : null;
      if (cena) usedCene.add(cena.id);

      planData.push({
        day: i + 1,
        day_name: dayNames[i % 7],
        colazione_id: colazione?.id || "",
        colazione_title: colazione?.title || "",
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
  };

  const deletePlan = async () => {
    if (!plan || !window.confirm("Elimina questo piano?")) return;
    await base44.entities.MealPlan.delete(plan.id);
    setPlan(null);
    toast.success("Piano eliminato");
  };

  const clearAllMeals = async () => {
    if (!plan || !window.confirm("Eliminare tutte le ricette dal piano?")) return;
    const newPlanData = plan.plan_data.map((d) => ({
      ...d,
      colazione_id: "",
      colazione_title: "",
      pranzo_id: "",
      pranzo_title: "",
      cena_id: "",
      cena_title: "",
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
              <>
                <Link to={createPageUrl("ShoppingList")}>
                  <Button size="sm" variant="outline" className="rounded-xl">
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAllMeals}
                  className="rounded-xl text-red-500 border-red-200 hover:bg-red-50"
                  title="Elimina tutte le ricette"
                >
                  <Trash className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={deletePlan}
                  className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
                  title="Elimina piano"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
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
            Pianifica i tuoi pasti per la settimana in 2 secondi
          </p>
          <Button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Crea Piano
          </Button>
        </div>
      )}

      {!creating && plan && (
        <div className="px-5 space-y-6">
          {plan.plan_data.map((dayPlan, dayIndex) => {
            const colazione = getRecipeById(dayPlan.colazione_id);
            const pranzo = getRecipeById(dayPlan.pranzo_id);
            const cena = getRecipeById(dayPlan.cena_id);

            return (
              <div key={dayIndex} className="border border-gray-100 rounded-2xl p-4 bg-white">
                <h3 className="font-bold text-gray-900 mb-3">{dayPlan.day_name}</h3>

                {/* Colazione */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-[#2D6A4F] mb-2">☀️ Colazione</p>
                  {colazione ? (
                    <>
                      <Link to={createPageUrl(`RecipeDetail?id=${colazione.id}`)}>
                        <div className="mb-2 rounded-lg overflow-hidden bg-gray-100 h-32 cursor-pointer hover:opacity-90 transition">
                          {colazione.image_url && (
                            <img
                              src={colazione.image_url}
                              alt={colazione.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </Link>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{colazione.title}</p>
                          {colazione.prep_time && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> {colazione.prep_time} min
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => swapRecipe(dayIndex, "colazione")}
                          className="text-xs text-[#2D6A4F] hover:bg-[#F0F7F4] px-2 py-1 rounded-lg transition font-medium"
                        >
                          <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> Sostituisci
                        </button>
                        <button
                          onClick={() => removeMeal(dayIndex, "colazione")}
                          className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition font-medium"
                        >
                          <X className="w-3.5 h-3.5 inline mr-1" /> Rimuovi
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setReplaceTarget({ dayIndex, meal: "colazione" })}
                      className="text-xs text-[#2D6A4F] font-semibold hover:bg-[#F0F7F4] px-2 py-1 rounded-lg transition w-full text-left"
                    >
                      + Aggiungi ricetta
                    </button>
                  )}
                </div>

                {/* Pranzo */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-[#2D6A4F] mb-2">🍽️ Pranzo</p>
                  {pranzo ? (
                    <>
                      <Link to={createPageUrl(`RecipeDetail?id=${pranzo.id}`)}>
                        <div className="mb-2 rounded-lg overflow-hidden bg-gray-100 h-32 cursor-pointer hover:opacity-90 transition">
                          {pranzo.image_url && (
                            <img
                              src={pranzo.image_url}
                              alt={pranzo.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </Link>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{pranzo.title}</p>
                          <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                            {pranzo.prep_time && (
                              <p className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {pranzo.prep_time} min
                              </p>
                            )}
                            {pranzo.calories && <p>{pranzo.calories} kcal</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => swapRecipe(dayIndex, "pranzo")}
                          className="text-xs text-[#2D6A4F] hover:bg-[#F0F7F4] px-2 py-1 rounded-lg transition font-medium"
                        >
                          <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> Sostituisci
                        </button>
                        <button
                          onClick={() => removeMeal(dayIndex, "pranzo")}
                          className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition font-medium"
                        >
                          <X className="w-3.5 h-3.5 inline mr-1" /> Rimuovi
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setReplaceTarget({ dayIndex, meal: "pranzo" })}
                      className="text-xs text-[#2D6A4F] font-semibold hover:bg-[#F0F7F4] px-2 py-1 rounded-lg transition w-full text-left"
                    >
                      + Aggiungi ricetta
                    </button>
                  )}
                </div>

                {/* Cena */}
                <div>
                  <p className="text-xs font-semibold text-[#2D6A4F] mb-2">🌙 Cena</p>
                  {cena ? (
                    <>
                      <Link to={createPageUrl(`RecipeDetail?id=${cena.id}`)}>
                        <div className="mb-2 rounded-lg overflow-hidden bg-gray-100 h-32 cursor-pointer hover:opacity-90 transition">
                          {cena.image_url && (
                            <img
                              src={cena.image_url}
                              alt={cena.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </Link>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{cena.title}</p>
                          <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                            {cena.prep_time && (
                              <p className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {cena.prep_time} min
                              </p>
                            )}
                            {cena.calories && <p>{cena.calories} kcal</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => swapRecipe(dayIndex, "cena")}
                          className="text-xs text-[#2D6A4F] hover:bg-[#F0F7F4] px-2 py-1 rounded-lg transition font-medium"
                        >
                          <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> Sostituisci
                        </button>
                        <button
                          onClick={() => removeMeal(dayIndex, "cena")}
                          className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition font-medium"
                        >
                          <X className="w-3.5 h-3.5 inline mr-1" /> Rimuovi
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setReplaceTarget({ dayIndex, meal: "cena" })}
                      className="text-xs text-[#2D6A4F] font-semibold hover:bg-[#F0F7F4] px-2 py-1 rounded-lg transition w-full text-left"
                    >
                      + Aggiungi ricetta
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {replaceTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
          <div className="bg-white mt-auto rounded-t-3xl p-5 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Scegli ricetta</h3>
              <button onClick={() => setReplaceTarget(null)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3">
              <input
                autoFocus
                type="text"
                placeholder="Cerca ricette..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {recipes
                .filter(
                  (r) =>
                    r.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                    !plan.plan_data.flatMap((d) => [d.colazione_id, d.pranzo_id, d.cena_id]).includes(r.id)
                )
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => replaceWithRecipe(r)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 font-medium transition border border-gray-100"
                  >
                    {r.title}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <PlannerModal
        open={showModal}
        onOpenChange={setShowModal}
        onCreatePlan={createPlan}
        loading={creating}
      />
    </div>
  );
}