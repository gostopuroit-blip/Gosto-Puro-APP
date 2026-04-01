import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Clock, ChefHat, Sparkles, ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RecipeCard from "@/components/RecipeCard";
import { toast } from "sonner";

const TIME_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 ora", value: 60 },
  { label: "Qualsiasi", value: 999 },
];

export default function WhatToCook() {
  const [recipes, setRecipes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState(30);
  const [ingredients, setIngredients] = useState([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    base44.entities.Recipe.list("-created_date", 200).then(setRecipes);
  }, []);

  const addIngredient = () => {
    const val = ingredientInput.trim().toLowerCase();
    if (!val || ingredients.includes(val)) return;
    setIngredients([...ingredients, val]);
    setIngredientInput("");
  };

  const removeIngredient = (ing) => {
    setIngredients(ingredients.filter((i) => i !== ing));
  };

  const search = async () => {
    setLoading(true);
    setSearched(true);

    let filtered = recipes;

    // Filter by time
    if (selectedTime < 999) {
      filtered = filtered.filter((r) => r.prep_time && r.prep_time <= selectedTime);
    }

    // Filter by ingredients (if any provided)
    if (ingredients.length > 0) {
      filtered = filtered.filter((r) => {
        if (!r.ingredients || r.ingredients.length === 0) return false;
        const recipeIngNames = r.ingredients.map((i) => i.name?.toLowerCase() || "");
        return ingredients.some((ing) =>
          recipeIngNames.some((ri) => ri.includes(ing))
        );
      });
    }

    // Sort by best match (most matching ingredients first)
    if (ingredients.length > 0) {
      filtered.sort((a, b) => {
        const aMatches = ingredients.filter((ing) =>
          a.ingredients?.some((i) => i.name?.toLowerCase().includes(ing))
        ).length;
        const bMatches = ingredients.filter((ing) =>
          b.ingredients?.some((i) => i.name?.toLowerCase().includes(ing))
        ).length;
        return bMatches - aMatches;
      });
    }

    setResults(filtered.slice(0, 20));
    setLoading(false);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <Link to={createPageUrl("Home")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2D6A4F]" />
            Cosa cucino adesso?
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Filtra per tempo e ingredienti disponibili</p>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-5">
        {/* Time filter */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2D6A4F]" /> Tempo disponibile
          </p>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedTime(t.value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  selectedTime === t.value
                    ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                    : "bg-white dark:bg-[#1A2B20] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#3D5246]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-[#2D6A4F]" /> Ingredienti disponibili <span className="text-xs font-normal text-gray-400">(opzionale)</span>
          </p>
          <div className="flex gap-2">
            <input
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addIngredient()}
              placeholder="Es. pomodoro, pasta..."
              className="flex-1 text-sm bg-white dark:bg-[#1A2B20] border border-gray-200 dark:border-[#3D5246] rounded-xl px-3 py-2 text-gray-800 dark:text-white outline-none"
            />
            <button
              onClick={addIngredient}
              className="bg-[#2D6A4F] text-white rounded-xl px-3 flex items-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {ingredients.map((ing) => (
                <span
                  key={ing}
                  className="flex items-center gap-1 bg-[#F0F7F4] dark:bg-[#1A2B20] text-[#2D6A4F] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#2D6A4F]/20"
                >
                  {ing}
                  <button onClick={() => removeIngredient(ing)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <Button
          onClick={search}
          disabled={loading}
          className="w-full bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl h-11 font-semibold text-base"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Trova ricette →"}
        </Button>
      </div>

      {/* Results */}
      {searched && (
        <div className="px-5 mt-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🤷</p>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Nessuna ricetta trovata</p>
              <p className="text-sm text-gray-400 mt-1">Prova con altri ingredienti o più tempo</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {results.length} ricette trovate
              </p>
              <div className="grid grid-cols-2 gap-3">
                {results.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} compact />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}