import { useRef, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Clock, Users, Star, Heart, ChefHat, Bookmark, Loader2, Check, Minus, Plus, Printer, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SaveToFolderModal from "@/components/SaveToFolderModal";
import { trackEvent } from "@/components/useAnalytics";
import RecipeComments from "@/components/recipe/RecipeComments";
import RecipeSostituzioni from "@/components/recipe/RecipeSostituzioni";

const countryFlags = {
  "Giappone": "🇯🇵", "Messico": "🇲🇽", "India": "🇮🇳", "Thailandia": "🇹🇭",
  "Spagna": "🇪🇸", "Grecia": "🇬🇷", "Stati Uniti": "🇺🇸", "Francia": "🇫🇷",
  "Cina": "🇨🇳", "Marocco": "🇲🇦", "Portogallo": "🇵🇹", "Turchia": "🇹🇷",
  "Libano": "🇱🇧", "Perù": "🇵🇪", "Vietnam": "🇻🇳",
};

function scaleQty(qtyStr, ratio) {
  if (!qtyStr || ratio === 1) return qtyStr;
  const match = String(qtyStr).match(/^([\d.,]+)\s*(.*)/);
  if (!match) return qtyStr;
  const num = parseFloat(match[1].replace(",", "."));
  const unit = match[2].trim();
  const scaled = num * ratio;
  const formatted = Number.isInteger(scaled) ? scaled : parseFloat(scaled.toFixed(1));
  return unit ? `${formatted} ${unit}` : `${formatted}`;
}

function IngredientRow({ ing, index, total, ratio, activeSostituzione }) {
  const [checked, setChecked] = useState(false);
  const displayQty = scaleQty(ing.quantity, ratio);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
        index < total - 1 ? "border-b border-gray-50" : ""
      } ${checked ? "bg-green-50/40" : "hover:bg-gray-50/30"}`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? "bg-[#2D6A4F] border-[#2D6A4F]" : "border-gray-200"
      }`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-sm flex-1 transition-all ${checked ? "line-through text-gray-300" : "text-gray-700"}`}>
        {ing.name}
        {activeSostituzione && (
          <span className="ml-2 text-[10px] font-bold bg-[#2D6A4F]/10 text-[#2D6A4F] px-1.5 py-0.5 rounded-full">
            → {activeSostituzione}
          </span>
        )}
      </span>
      <span className={`text-sm font-medium flex-shrink-0 ${checked ? "text-gray-200" : "text-gray-400"}`}>
        {displayQty}
      </span>
    </button>
  );
}

export default function RecipeDetail() {
  const [recipe, setRecipe] = useState(null);
  const [userRecipe, setUserRecipe] = useState(null);
  const [user, setUser] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [preparedCount, setPreparedCount] = useState(0);
  const [freeRecipeIds, setFreeRecipeIds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [servings, setServings] = useState(null);
  const [activeTab, setActiveTab] = useState("ingredienti");
  const scrollTracked = useRef(new Set());
  const viewStartRef = useRef(null);

  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const recipeId = params.get("id");

  // Track recipe_view_end on page leave
  useEffect(() => {
    return () => {
      if (viewStartRef.current && recipeId) {
        const duration = Math.round((Date.now() - viewStartRef.current) / 1000);
        if (duration >= 2) {
          trackEvent("recipe_view_end", { recipe_id: recipeId, duration_seconds: duration });
        }
      }
    };
  }, [recipeId]);

  useEffect(() => {
    if (!recipeId) return;
    const handleScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop + el.clientHeight;
      const total = el.scrollHeight;
      const pct = Math.round((scrolled / total) * 100);
      [25, 50, 75, 100].forEach(milestone => {
        if (pct >= milestone && !scrollTracked.current.has(milestone)) {
          scrollTracked.current.add(milestone);
          trackEvent("recipe_scroll", { recipe_id: recipeId, scroll_percentage: milestone });
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [recipeId]);

  const FREE_SAVE_LIMIT = 4;

  useEffect(() => {
    if (recipeId) loadRecipe();
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, [recipeId]);

  const loadRecipe = async () => {
    const currentUser = await base44.auth.me().catch(() => null);
    const [recipes, userRecipes, allSaved, allPrepared, recentRecipes] = await Promise.all([
      base44.entities.Recipe.filter({ id: recipeId }),
      currentUser
        ? base44.entities.UserRecipe.filter({ recipe_id: recipeId, created_by: currentUser.email })
        : Promise.resolve([]),
      currentUser
        ? base44.entities.UserRecipe.filter({ is_saved: true, created_by: currentUser.email })
        : Promise.resolve([]),
      currentUser
        ? base44.entities.UserRecipe.filter({ is_prepared: true, created_by: currentUser.email })
        : Promise.resolve([]),
      base44.entities.FreeRecipe.list("-created_date", 500),
    ]);
    setFreeRecipeIds(new Set(recentRecipes.map((r) => r.recipe_id)));
    if (recipes.length > 0) {
      setRecipe(recipes[0]);
      setServings(recipes[0].servings || 4);
      trackEvent("recipe_view", { recipe_id: recipeId, recipe_title: recipes[0].title });
      trackEvent("recipe_view_start", { recipe_id: recipeId, recipe_title: recipes[0].title });
      viewStartRef.current = Date.now();
    }
    if (userRecipes.length > 0) setUserRecipe(userRecipes[0]);
    setSavedCount(allSaved.length);
    setPreparedCount(allPrepared.length);
    setLoading(false);
  };

  // OPEN ACCESS: todos têm acesso total
  const isPremium = true;
  const isContentLocked = false;

  const handlePrint = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 20;

    const addPageIfNeeded = (needed = 10) => {
      if (y + needed > 275) {
        doc.addPage();
        y = 20;
      }
    };

    const writeWrapped = (text, x, startY, maxW, lineH, color = [30, 30, 30]) => {
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxW);
      lines.forEach(line => {
        addPageIfNeeded(lineH);
        doc.text(line, x, y);
        y += lineH;
      });
    };

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(45, 106, 79);
    const titleLines = doc.splitTextToSize(recipe.title, contentW);
    titleLines.forEach(line => { doc.text(line, margin, y); y += 9; });
    y += 2;

    // Meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const meta = [recipe.category, recipe.difficulty || "Facile", `${recipe.prep_time} min`, `${servings} ${servings === 1 ? "porzione" : "porzioni"}`].filter(Boolean).join("  •  ");
    doc.text(meta, margin, y);
    y += 8;

    // Description
    if (recipe.description) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      writeWrapped(recipe.description, margin, y, contentW, 5, [80, 80, 80]);
      y += 4;
    }

    // Macros
    const kcal = recipe.calorie ?? recipe.calories;
    if (kcal || recipe.proteine || recipe.carboidrati || recipe.grassi) {
      addPageIfNeeded(14);
      doc.setFillColor(240, 248, 244);
      doc.roundedRect(margin, y, contentW, 12, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(45, 106, 79);
      const macroText = [
        kcal ? `${kcal} kcal` : null,
        recipe.proteine ? `${recipe.proteine}g Prot` : null,
        recipe.carboidrati ? `${recipe.carboidrati}g Carbs` : null,
        recipe.grassi ? `${recipe.grassi}g Grassi` : null,
      ].filter(Boolean).join("    ");
      doc.text(macroText, margin + 4, y + 7.5);
      y += 18;
    }

    // Ingredienti
    addPageIfNeeded(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(45, 106, 79);
    doc.text("Ingredienti", margin, y);
    y += 2;
    doc.setDrawColor(45, 106, 79);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentW, y);
    y += 6;

    const ratio = servings / (recipe.servings || 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    (recipe.ingredients || []).forEach(ing => {
      addPageIfNeeded(7);
      const qty = scaleQty(ing.quantity, ratio);
      doc.setTextColor(30, 30, 30);
      doc.text(`• ${ing.name}`, margin + 2, y);
      if (qty) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(45, 106, 79);
        doc.text(qty, pageW - margin, y, { align: "right" });
        doc.setFont("helvetica", "normal");
      }
      y += 6.5;
    });
    y += 4;

    // Preparazione
    addPageIfNeeded(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(45, 106, 79);
    doc.text("Preparazione", margin, y);
    y += 2;
    doc.line(margin, y, margin + contentW, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    (recipe.instructions || []).forEach((step, i) => {
      addPageIfNeeded(8);
      // Step number circle
      doc.setFillColor(45, 106, 79);
      doc.circle(margin + 3, y - 1.5, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), margin + 3, y - 0.3, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(step, contentW - 8);
      lines.forEach((line, li) => {
        addPageIfNeeded(6);
        doc.setTextColor(30, 30, 30);
        doc.text(line, margin + 8, li === 0 ? y : y);
        if (li === 0 && lines.length > 1) y += 5.5;
        else if (li > 0) y += 5.5;
      });
      y += 7;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Gosto Puro — gusto-puro.com", margin, 290);
      doc.text(`${p} / ${totalPages}`, pageW - margin, 290, { align: "right" });
    }

    const filename = recipe.title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").trim().replace(/\s+/g, "_") + ".pdf";
    doc.save(filename);
  };

  const handleSaveClick = () => {
    if (!user) {
      toast.error("Accedi per salvare le ricette");
      return;
    }

    if (!userRecipe?.is_saved) {
      trackEvent("recipe_saved", { recipe_id: recipeId, recipe_title: recipe?.title });
    }
    setShowSaveModal(true);
  };

  const handlePrepare = async () => {
    setSaving(true);
    if (userRecipe) {
      await base44.entities.UserRecipe.update(userRecipe.id, { is_prepared: true, status: "fatta" });
    } else {
      await base44.entities.UserRecipe.create({ recipe_id: recipeId, is_prepared: true, status: "fatta" });
    }
    await loadRecipe();
    toast.success("Complimenti! Ricetta preparata! 👨‍🍳");
    setSaving(false);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error("Accedi per aggiungere ai preferiti");
      return;
    }
    const newVal = !userRecipe?.is_favorite;
    if (userRecipe?.id) {
      await base44.entities.UserRecipe.update(userRecipe.id, { is_favorite: newVal });
      setUserRecipe((prev) => ({ ...prev, is_favorite: newVal }));
    } else {
      const created = await base44.entities.UserRecipe.create({ recipe_id: recipeId, is_favorite: newVal });
      setUserRecipe(created);
    }
    toast.success(newVal ? "Aggiunta ai preferiti ❤️" : "Rimossa dai preferiti");
  };

  const handleRate = async (rating) => {
    if (userRecipe?.id) {
      await base44.entities.UserRecipe.update(userRecipe.id, { user_rating: rating });
      setUserRecipe((prev) => ({ ...prev, user_rating: rating }));
    } else {
      const created = await base44.entities.UserRecipe.create({ recipe_id: recipeId, user_rating: rating });
      setUserRecipe(created);
    }
    toast.success("Grazie per la valutazione! ⭐");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-400">Ricetta non trovata</p>
        <Link to={createPageUrl("Home")} className="text-[#2D6A4F] font-semibold text-sm">
          Torna alla home
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="relative">
        <img
          src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800"}
          alt={recipe.title}
          className="w-full aspect-[4/3] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <button
          onClick={handleSaveClick}
          className="absolute top-12 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
        >
          <Heart className={`w-5 h-5 transition-colors ${userRecipe?.is_saved ? "text-rose-500 fill-rose-500" : "text-gray-600"}`} />
        </button>
      </div>

      <div className="px-5 -mt-6 relative">
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {recipe.title}{recipe.paese && countryFlags[recipe.paese] ? ` ${countryFlags[recipe.paese]}` : ""}
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                {recipe.category} • {recipe.difficulty || "Facile"}
                {recipe.paese && ` • ${recipe.paese}`}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 rounded-full px-2.5 py-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-amber-700">{recipe.media_rating || "—"}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Clock className="w-4 h-4 text-[#2D6A4F]" />
              <span className="text-xs font-semibold">{recipe.prep_time} min</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl px-2 py-1.5">
              <Users className="w-4 h-4 text-[#2D6A4F]" />
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Minus className="w-3 h-3 text-gray-600" />
              </button>
              <span className="text-xs font-bold w-5 text-center">{servings}</span>
              <button
                onClick={() => setServings((s) => Math.min(20, s + 1))}
                className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-3 h-3 text-gray-600" />
              </button>
            </div>
            <button
              onClick={handleToggleFavorite}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${userRecipe?.is_favorite ? "bg-rose-50" : "bg-gray-50"}`}
            >
              <Heart className={`w-4 h-4 transition-colors ${userRecipe?.is_favorite ? "text-rose-500 fill-rose-500" : "text-rose-400"}`} />
              <span className="text-xs font-semibold">{recipe.numero_salvate || 0}</span>
            </button>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <ChefHat className="w-4 h-4 text-[#2D6A4F]" />
              <span className="text-xs font-semibold">{recipe.numero_preparate || 0}</span>
            </div>
          </div>

          {/* Macros box */}
          {(() => {
            const mp = userRecipe?.macros_personalizzati;
            const hasPersonalized = mp && (mp.calorie != null || mp.proteine != null || mp.carboidrati != null || mp.grassi != null);
            const macros = [
              { label: "Calorie", value: hasPersonalized && mp.calorie != null ? mp.calorie : (recipe.calorie ?? recipe.calories), unit: "kcal" },
              { label: "Proteine", value: hasPersonalized && mp.proteine != null ? mp.proteine : recipe.proteine, unit: "g" },
              { label: "Carboidrati", value: hasPersonalized && mp.carboidrati != null ? mp.carboidrati : recipe.carboidrati, unit: "g" },
              { label: "Grassi", value: hasPersonalized && mp.grassi != null ? mp.grassi : recipe.grassi, unit: "g" },
            ];
            return (
              <>
                {hasPersonalized && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-[#2D6A4F]/10 text-[#2D6A4F] px-2.5 py-1 rounded-full">
                      ✏️ Personalizzata
                    </span>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  {macros.map((macro) => (
                    <div key={macro.label} className={`flex-1 rounded-xl py-2.5 px-1 flex flex-col items-center gap-0.5 ${hasPersonalized ? "bg-[#2D6A4F]/8 border border-[#2D6A4F]/20" : "bg-gray-50"}`}>
                      <span className="text-base font-bold text-gray-800 leading-tight">
                        {macro.value != null ? macro.value : "—"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">{macro.label}</span>
                      {macro.value != null && <span className="text-[10px] text-gray-300">{macro.unit}</span>}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* Info box */}
          <div className="flex gap-2 mt-3">
            {[
              { label: "Tempo", value: recipe.prep_time, unit: "min", icon: "⏱" },
              { label: "Difficoltà", value: recipe.difficulty, unit: null, icon: "⭐" },
              { label: "Porzioni", value: recipe.servings, unit: null, icon: "🍽" },
              { label: "Ingredienti", value: (recipe.ingredients || []).length || "—", unit: null, icon: "🥗" },
            ].map((info) => (
              <div key={info.label} className="flex-1 bg-gray-50 rounded-xl py-2.5 px-1 flex flex-col items-center gap-0.5">
                <span className="text-base font-bold text-gray-800 leading-tight">
                  {info.value != null && info.value !== "" ? info.value : "—"}
                </span>
                {info.unit && info.value != null && <span className="text-[10px] text-gray-300">{info.unit}</span>}
                <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">{info.icon} {info.label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 mt-4 leading-relaxed">{recipe.description}</p>
          {(recipe.calories || recipe.calorie) && (() => {
            const mp = userRecipe?.macros_personalizzati;
            const kcal = (mp?.calorie != null) ? mp.calorie : (recipe.calories || recipe.calorie);
            return (
              <div className="flex items-center gap-3 mt-3 bg-orange-50 rounded-xl px-3 py-2.5 w-fit">
                <span className="text-base">🔥</span>
                <div>
                  <div className="text-xs font-bold text-orange-600">{kcal} kcal / porzione</div>
                  <div className="text-xs text-orange-400 mt-0.5">
                    Totale: {Math.round(kcal * servings)} kcal ({servings} {servings === 1 ? "porzione" : "porzioni"})
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-6">
        <div className="flex border-b border-gray-100 overflow-x-auto hide-scrollbar">
          {[
            { key: "ingredienti", label: "Ingredienti" },
            { key: "preparazione", label: "Preparazione" },
            { key: "nutrizione", label: "Nutrizione" },
            ...((recipe.sostituzioni || []).length > 0 ? [{ key: "sostituzioni", label: "Sostituzioni" }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "text-[#2D6A4F] border-b-2 border-[#2D6A4F]"
                  : "text-gray-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Ingredienti */}
        {activeTab === "ingredienti" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Lista Ingredienti</p>
              <span className="text-xs text-gray-400">per {servings} {servings === 1 ? "persona" : "persone"}</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                {(recipe.ingredients || []).map((ing, i) => {
                  const sostApplied = (userRecipe?.sostituzioni_applicate || []).find(
                    (s) =>
                      ing.name.toLowerCase().includes(s.ingrediente_nome.toLowerCase()) ||
                      s.ingrediente_nome.toLowerCase().includes(ing.name.toLowerCase())
                  );
                  return (
                  <IngredientRow
                    key={i}
                    ing={ing}
                    index={i}
                    total={(recipe.ingredients || []).length}
                    ratio={servings / (recipe.servings || 4)}
                    activeSostituzione={sostApplied?.sostituto_scelto}
                  />
                  );
                })}
              </div>
          </div>
        )}

        {/* Tab: Preparazione */}
        {activeTab === "preparazione" && (
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">Passo per Passo</p>
            <div className="space-y-3">
                {(recipe.instructions || []).map((step, i) => (
                  <div key={i} className="flex gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                    <div className="w-7 h-7 rounded-full bg-[#2D6A4F] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{step}</p>
                  </div>
                ))}
              </div>
          </div>
        )}

        {/* Tab: Sostituzioni */}
        {activeTab === "sostituzioni" && (
          <RecipeSostituzioni
            recipe={recipe}
            userRecipe={userRecipe}
            recipeId={recipeId}
            onSaved={loadRecipe}
            onApplied={({ sostituzioni_applicate, macros_personalizzati }) => {
              setUserRecipe((prev) => ({
                ...(prev || { recipe_id: recipeId }),
                sostituzioni_applicate,
                macros_personalizzati,
              }));
            }}
          />
        )}

        {/* Tab: Nutrizione */}
        {activeTab === "nutrizione" && (
          <div className="mt-4">
            {!(recipe.calorie || recipe.proteine || recipe.carboidrati || recipe.grassi || recipe.fibre || recipe.sodio) ? (
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-50">
                <p className="text-sm text-gray-400">Valori nutrizionali non disponibili per questa ricetta.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Calorie", value: recipe.calorie ?? recipe.calories, unit: "kcal" },
                    { label: "Proteine", value: recipe.proteine, unit: "g" },
                    { label: "Carboidrati", value: recipe.carboidrati, unit: "g" },
                    { label: "Grassi", value: recipe.grassi, unit: "g" },
                    { label: "Fibre", value: recipe.fibre, unit: "g" },
                    { label: "Sodio", value: recipe.sodio, unit: "mg" },
                  ].map((n) => (
                    <div key={n.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex flex-col items-center gap-0.5">
                      <span className="text-xl font-bold text-gray-800">{n.value != null ? n.value : "—"}</span>
                      {n.value != null && <span className="text-xs text-gray-400">{n.unit}</span>}
                      <span className="text-xs text-gray-500 font-medium">{n.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                  Valori stimati per 1 porzione. Possono variare in base agli ingredienti utilizzati.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-5 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Valuta questa ricetta</h2>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              className="p-1 transition-transform hover:scale-125 active:scale-90"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (userRecipe?.user_rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        <Button
          onClick={handlePrepare}
          disabled={saving}
          className="w-full py-6 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold text-sm shadow-lg shadow-[#2D6A4F]/20"
        >
          <ChefHat className="w-5 h-5 mr-2" />
          {userRecipe?.is_prepared ? "Preparata di nuovo!" : "Preparare ricetta"}
        </Button>
        <Button
          onClick={handleSaveClick}
          variant="outline"
          className="w-full py-6 rounded-2xl border-2 font-bold text-sm"
        >
          <Bookmark className="w-5 h-5 mr-2" />
          {userRecipe?.is_saved ? "Salvata ✓" : "Salvare"}
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="w-full py-6 rounded-2xl border-2 font-bold text-sm"
        >
          <Printer className="w-5 h-5 mr-2" />
          Stampa ricetta
        </Button>
      </div>



      {/* Comments */}
      <div className="px-5 mt-6">
        <RecipeComments recipeId={recipeId} currentUser={user} />
      </div>

      <SaveToFolderModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        recipeId={recipeId}
        onSaved={loadRecipe}
      />

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3 flex gap-3 max-w-lg mx-auto">
        <Button
          onClick={() => navigate(createPageUrl("Planner"))}
          className="flex-1 py-5 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold text-sm shadow-lg shadow-[#2D6A4F]/20"
        >
          <CalendarDays className="w-5 h-5 mr-2" />
          Aggiungi al Planner
        </Button>
        <Button
          onClick={handleSaveClick}
          variant="outline"
          className="flex-1 py-5 rounded-2xl border-2 border-[#2D6A4F] text-[#2D6A4F] font-bold text-sm hover:bg-[#2D6A4F]/5"
        >
          <Bookmark className="w-5 h-5 mr-2" />
          {userRecipe?.is_saved ? "Salvata ✓" : "Salva Ricetta"}
        </Button>
      </div>
    </div>
  );
}