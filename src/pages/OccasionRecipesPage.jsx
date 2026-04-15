import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Search, Heart, Star, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const OCCASION_ICONS = {
  "Fit": "🏋️", "Detox": "🌿", "Low carb": "🥗", "Low Carb": "🥗",
  "Colazione": "☕", "Pranzo": "🍝", "Cena": "🌙", "Estate": "☀️",
  "Primavera": "🌸", "Dolce": "🍮", "Dolci": "🍮", "Snack": "🍎",
  "Bevanda": "🥤", "Proteiche": "💪", "Diabete": "🩺",
  "Senza zucchero": "🚫🍬", "Veloci": "⚡", "In famiglia": "👨‍👩‍👧",
  "Con amici": "🎉", "Dal mondo": "🌍", "Leggera": "🥙",
  "Instagram": "📸", "Inverno": "❄️", "Autunno": "🍂",
  "Per due": "💑", "Natale e Capodanno": "🎄",
};

const CATEGORY_PILLS = ["Tutte", "Colazione", "Pranzo", "Cena", "Snack", "Dolce", "Bevanda"];

const DIETARY_TAG_COLORS = {
  "Senza glutine": "bg-green-900/40 text-green-300",
  "Diabetico": "bg-orange-900/40 text-orange-300",
  "Low carb": "bg-blue-900/40 text-blue-300",
  "Alto contenuto proteico": "bg-blue-900/40 text-blue-300",
  "Vegano": "bg-lime-900/40 text-lime-300",
  "Vegetariano": "bg-lime-900/40 text-lime-300",
  "Senza lattosio": "bg-red-900/40 text-red-300",
  "Senza zucchero": "bg-red-900/40 text-red-300",
  "Detox": "bg-teal-900/40 text-teal-300",
  "Fit": "bg-teal-900/40 text-teal-300",
  "Senza uova": "bg-yellow-900/40 text-yellow-300",
  "Senza frutti di mare": "bg-purple-900/40 text-purple-300",
};

export default function OccasionRecipesPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const occasion = params.get("occasion") || "";

  const [recipes, setRecipes] = useState([]);
  const [userRecipes, setUserRecipes] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tutte");

  useEffect(() => {
    if (occasion) loadRecipes();
  }, [occasion]);

  const loadRecipes = async () => {
    setLoading(true);
    const [allRecipes, user] = await Promise.all([
      base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", 300),
      base44.auth.me().catch(() => null),
    ]);

    // Filter by occasion (in occasions array OR lifestyle array)
    const filtered = allRecipes.filter((r) =>
      (r.occasions || []).includes(occasion) ||
      (r.lifestyle || []).includes(occasion)
    );
    setRecipes(filtered);

    // Load user favorites
    if (user) {
      const saved = await base44.entities.UserRecipe.filter({ is_saved: true, created_by: user.email }).catch(() => []);
      const map = {};
      saved.forEach((ur) => { map[ur.recipe_id] = ur; });
      setUserRecipes(map);
    }

    setLoading(false);
  };

  const filteredRecipes = recipes.filter((r) => {
    const matchesQuery = !query.trim() ||
      r.title?.toLowerCase().includes(query.toLowerCase()) ||
      r.description?.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === "Tutte" || r.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  const categories = [...new Set(recipes.map((r) => r.category).filter(Boolean))];
  const icon = OCCASION_ICONS[occasion] || "🍽️";

  return (
    <div className="min-h-screen bg-[#111] text-white pb-24">
      {/* Header */}
      <div className="bg-[#1A1A1A] px-5 pt-12 pb-5 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <h1 className="text-xl font-bold text-white">{occasion}</h1>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Collezione completa · {recipes.length} ricette</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          {[
            { label: "Ricette", value: recipes.length },
            { label: "Categorie", value: categories.length },
            { label: "Preferite", value: Object.keys(userRecipes).length },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-white/5 rounded-xl py-2 px-3 text-center">
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cerca ricette..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/8 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2D6A4F]"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
          {CATEGORY_PILLS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeCategory === cat
                  ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                  : "bg-white/5 border-white/10 text-gray-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-gray-400 font-semibold">Nessuna ricetta trovata</p>
            {query && <p className="text-gray-500 text-sm mt-1">Prova a modificare la ricerca</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                occasion={occasion}
                isSaved={!!userRecipes[recipe.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, occasion, isSaved }) {
  const kcal = recipe.calorie ?? recipe.calories;

  return (
    <Link
      to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
      className="flex gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
    >
      {/* Thumbnail */}
      <div className="w-24 h-24 flex-shrink-0 relative">
        <img
          src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=200"}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        {isSaved && (
          <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 py-3 pr-3 min-w-0">
        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          <span className="text-[10px] font-bold bg-[#2D6A4F]/30 text-[#52b788] px-2 py-0.5 rounded-full">
            {occasion}
          </span>
          {recipe.category && (
            <span className="text-[10px] font-bold bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full">
              {recipe.category}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-1.5">
          {recipe.title}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1.5">
          {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
          {kcal && <span>🔥 {kcal} kcal</span>}
          {recipe.difficulty && <span>{recipe.difficulty}</span>}
          {recipe.media_rating && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {recipe.media_rating}
            </span>
          )}
        </div>

        {/* Dietary tags */}
        {(recipe.dietary_tags || []).length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {recipe.dietary_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${DIETARY_TAG_COLORS[tag] || "bg-gray-800 text-gray-400"}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}