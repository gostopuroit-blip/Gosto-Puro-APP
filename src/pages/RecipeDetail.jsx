import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Clock, Users, Star, Heart, ChefHat, Bookmark, Loader2, Flame, Check, Minus, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SaveToFolderModal from "@/components/SaveToFolderModal";

function IngredientRow({ ing, index, total }) {
  const [checked, setChecked] = useState(false);
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
        {ing.quantity}
      </span>
    </button>
  );
}

export default function RecipeDetail() {
  const [recipe, setRecipe] = useState(null);
  const [userRecipe, setUserRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const recipeId = params.get("id");

  useEffect(() => {
    if (recipeId) loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    const [recipes, userRecipes] = await Promise.all([
      base44.entities.Recipe.filter({ id: recipeId }),
      base44.entities.UserRecipe.filter({ recipe_id: recipeId }),
    ]);
    if (recipes.length > 0) setRecipe(recipes[0]);
    if (userRecipes.length > 0) setUserRecipe(userRecipes[0]);
    setLoading(false);
  };

  const handleSaveClick = () => {
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
        <Link
          to={createPageUrl("Recipes")}
          className="absolute top-12 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </Link>
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
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{recipe.title}</h1>
              <p className="text-xs text-gray-400 mt-1">{recipe.category} • {recipe.difficulty || "Facile"}</p>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 rounded-full px-2.5 py-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-amber-700">{recipe.media_rating || "—"}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Clock className="w-4 h-4 text-[#2D6A4F]" />
              <span className="text-xs font-semibold">{recipe.prep_time} min</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Users className="w-4 h-4 text-[#2D6A4F]" />
              <span className="text-xs font-semibold">{recipe.servings || 2} porzioni</span>
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
            <div className="flex items-center gap-2 mt-3 bg-orange-50 rounded-xl px-3 py-2 w-fit">
              <span className="text-base">🔥</span>
              <span className="text-xs font-bold text-orange-600">{recipe.calories} kcal per porzione</span>
            </div>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Ingredienti</h2>
          <span className="text-xs text-gray-400">Segna ciò che hai già</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {(recipe.ingredients || []).map((ing, i) => (
            <IngredientRow key={i} ing={ing} index={i} total={(recipe.ingredients || []).length} />
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