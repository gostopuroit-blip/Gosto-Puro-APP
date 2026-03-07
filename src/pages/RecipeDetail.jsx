import { useState, useEffect } from "react";

const countryFlags = {
  "Giappone": "🇯🇵", "Messico": "🇲🇽", "India": "🇮🇳", "Thailandia": "🇹🇭",
  "Spagna": "🇪🇸", "Grecia": "🇬🇷", "Stati Uniti": "🇺🇸", "Francia": "🇫🇷",
  "Cina": "🇨🇳", "Marocco": "🇲🇦", "Portogallo": "🇵🇹", "Turchia": "🇹🇷",
  "Libano": "🇱🇧", "Perù": "🇵🇪", "Vietnam": "🇻🇳",
};
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Clock, Users, Star, Heart, ChefHat, Bookmark, Loader2, Flame, Check, Minus, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SaveToFolderModal from "@/components/SaveToFolderModal";
import { trackEvent } from "@/components/useAnalytics";

// Scale a quantity string by a ratio
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

function IngredientRow({ ing, index, total, ratio }) {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [servings, setServings] = useState(null);

  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const recipeId = params.get("id");

  const FREE_SAVE_LIMIT = 4;

  useEffect(() => {
    if (recipeId) loadRecipe();
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, [recipeId]);

  const loadRecipe = async () => {
    const currentUser = await base44.auth.me().catch(() => null);
    const [recipes, userRecipes, allSaved] = await Promise.all([
      base44.entities.Recipe.filter({ id: recipeId }),
      currentUser
        ? base44.entities.UserRecipe.filter({ recipe_id: recipeId, created_by: currentUser.email })
        : Promise.resolve([]),
      currentUser
        ? base44.entities.UserRecipe.filter({ is_saved: true, created_by: currentUser.email })
        : Promise.resolve([]),
    ]);
    if (recipes.length > 0) {
      setRecipe(recipes[0]);
      setServings(recipes[0].servings || 4);
      trackEvent("recipe_view", { recipe_id: recipeId, recipe_title: recipes[0].title });
    }
    if (userRecipes.length > 0) setUserRecipe(userRecipes[0]);
    setSavedCount(allSaved.length);
    setLoading(false);
  };

  const isPremium = user?.plan === "premium" || user?.role === "admin";

  const handleSaveClick = () => {
    if (!isPremium && !userRecipe?.is_saved && savedCount >= FREE_SAVE_LIMIT) {
      toast.error(`Piano Free: puoi salvare solo ${FREE_SAVE_LIMIT} ricette. Passa a Premium per salvarne di più! ✨`);
      trackEvent("premium_view", { recipe_id: recipeId, recipe_title: recipe?.title });
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
      await base44.entities.UserRecipe.update(userRecipe.id, {
        is_prepared: true,
        status: "fatta",
      });
    } else {
      await base44.entities.UserRecipe.create({
        recipe_id: recipeId,
        is_prepared: true,
        status: "fatta",
      });
    }
    const newCount = (recipe.numero_preparate || 0) + 1;
    await base44.entities.Recipe.update(recipeId, { numero_preparate: newCount });
    await loadRecipe();
    toast.success("Complimenti! Ricetta preparata! 👨‍🍳");
    setSaving(false);
  };

  const handleRate = async (rating) => {
    const oldRating = userRecipe?.user_rating || 0;
    const newTotal = (recipe.total_rating || 0) - oldRating + rating;
    const newCount = (recipe.rating_count || 0) + (oldRating ? 0 : 1);
    const newAvg = newTotal / newCount;

    if (userRecipe) {
      await base44.entities.UserRecipe.update(userRecipe.id, { user_rating: rating });
    } else {
      await base44.entities.UserRecipe.create({
        recipe_id: recipeId,
        user_rating: rating,
      });
    }
    await base44.entities.Recipe.update(recipeId, {
      total_rating: newTotal,
      rating_count: newCount,
      media_rating: Math.round(newAvg * 10) / 10,
    });
    await loadRecipe();
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
    <div className="pb-8">
      {/* Hero Image */}
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
          <Heart
            className={`w-5 h-5 transition-colors ${
              userRecipe?.is_saved ? "text-rose-500 fill-rose-500" : "text-gray-600"
            }`}
          />
        </button>
      </div>

      {/* Content */}
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

          {/* Stats */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Clock className="w-4 h-4 text-[#2D6A4F]" />
              <span className="text-xs font-semibold">{recipe.prep_time} min</span>
            </div>
            {/* Servings selector */}
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
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Heart className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold">{recipe.numero_salvate || 0}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <ChefHat className="w-4 h-4 text-[#2D6A4F]" />
              <span className="text-xs font-semibold">{recipe.numero_preparate || 0}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4 leading-relaxed">{recipe.description}</p>
          {recipe.calories && (
            <div className="flex items-center gap-3 mt-3 bg-orange-50 rounded-xl px-3 py-2.5 w-fit">
              <span className="text-base">🔥</span>
              <div>
                <div className="text-xs font-bold text-orange-600">
                  {recipe.calories} kcal / porzione
                </div>
                <div className="text-xs text-orange-400 mt-0.5">
                  Totale: {Math.round(recipe.calories * servings)} kcal ({servings} {servings === 1 ? "porzione" : "porzioni"})
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Ingredienti</h2>
          <span className="text-xs text-gray-400">per {servings} {servings === 1 ? "persona" : "persone"}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {(recipe.ingredients || []).map((ing, i) => (
            <IngredientRow
              key={i}
              ing={ing}
              index={i}
              total={(recipe.ingredients || []).length}
              ratio={servings / (recipe.servings || 4)}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="px-5 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Preparazione</h2>
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

      {/* Rating */}
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
                  star <= (userRecipe?.user_rating || 0)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
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
      </div>

      <SaveToFolderModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        recipeId={recipeId}
        onSaved={loadRecipe}
      />
    </div>
  );
}