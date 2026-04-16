import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Search, Heart, Star, Loader2, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUserAccessibleOccasions } from "@/hooks/useGetUserAccessibleOccasions";

const OCCASION_ICONS = {
  "Fit": "🏋️", "Detox": "🌿", "Low carb": "🥗", "Low Carb": "🥗",
  "Colazione": "☕", "Pranzo": "🍝", "Cena": "🌙", "Estate": "☀️",
  "Primavera": "🌸", "Dolce": "🍮", "Dolci": "🍮", "Snack": "🍎",
  "Bevanda": "🥤", "Proteiche": "💪", "Diabete": "🩺",
  "Senza zucchero": "🚫🍬", "Veloci": "⚡", "In famiglia": "👨‍👩‍👧",
  "Con amici": "🎉", "Dal mondo": "🌍", "Leggera": "🥙",
  "Instagram": "📸", "Inverno": "❄️", "Autunno": "🍂",
  "Per due": "💑", "Natale e Capodanno": "🎄"
};

const DAILY_OCCASIONS = ["Colazione", "Pranzo", "Cena"];
const CATEGORY_PILLS = ["Tutte", "Colazione", "Pranzo", "Cena", "Snack", "Dolce", "Bevanda"];
const PAGE_SIZE = 6;
// Max recipes to fetch in a single query — covers all known occasions
const FETCH_LIMIT = 1000;

// Occasione aliases para buscar receitas com labels antigos/novos
const occasionAliases = {
  "365 Ricette Deliziose per Diabetici": ["Diabete", "365 Ricette Deliziose per Diabetici"],
  "275 Ricette Fitness Pratiche ed Economiche": ["Fit", "275 Ricette Fitness Pratiche ed Economiche"]
};

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
  "Senza frutti di mare": "bg-purple-900/40 text-purple-300"
};

// Module-level cache so navigating back doesn't re-fetch
const recipesCache = {};

export default function OccasionRecipesPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const occasion = params.get("occasion") || "";

  const [allOccasionRecipes, setAllOccasionRecipes] = useState([]);
  const [dailyRecipes, setDailyRecipes] = useState([]);
  const [userRecipes, setUserRecipes] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tutte");
  const [page, setPage] = useState(1);
  const [soloPerMe, setSoloPerMe] = useState(false);
  const [userDietaryTags, setUserDietaryTags] = useState([]);
  const [user, setUser] = useState(null);
  const [isAccessible, setIsAccessible] = useState(true);
  const [blockedRecipeId, setBlockedRecipeId] = useState(null);

  const showDaily = DAILY_OCCASIONS.includes(occasion);

  useEffect(() => {
    if (!occasion) return;
    loadData();
  }, [occasion]);

  const loadData = async () => {
    setLoading(true);

    // Fetch user e check acesso
    const userData = await base44.auth.me().catch(() => null);
    setUser(userData);

    const accessible = getUserAccessibleOccasions(userData);
    const canAccess = accessible.includes("ALL") || accessible.includes(occasion);
    setIsAccessible(canAccess);

    // Se não tem acesso, não carrega recipes
    if (!canAccess) {
      setLoading(false);
      return;
    }

    // Use cache to avoid re-fetching on back navigation
    if (!recipesCache[occasion]) {
      const batch = await base44.entities.Recipe.filter(
        { status: "pubblicata" },
        "-created_date",
        FETCH_LIMIT
      );
      // Use occasion aliases if available, otherwise use the occasion directly
      const searchTerms = occasionAliases[occasion] || [occasion];
      const filtered = batch.filter((r) =>
      searchTerms.some((term) =>
      (r.occasions || []).includes(term) ||
      (r.lifestyle || []).includes(term)
      )
      );
      recipesCache[occasion] = filtered;
    }

    const occasionRecipes = recipesCache[occasion];
    setAllOccasionRecipes(occasionRecipes);

    // Pick 3 stable "daily" recipes (deterministic based on today's date)
    if (showDaily && occasionRecipes.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const seed = today.split("-").reduce((a, b) => a + parseInt(b), 0);
      const picked = [];
      for (let i = 0; i < Math.min(3, occasionRecipes.length); i++) {
        picked.push(occasionRecipes[(seed + i * 37) % occasionRecipes.length]);
      }
      setDailyRecipes(picked);
    }

    // Load user favorites + dietary tags in parallel (non-blocking)
    if (userData) {
      const saved = await base44.entities.UserRecipe.filter({ is_saved: true, created_by: userData.email }).catch(() => []);
      const map = {};
      saved.forEach((ur) => {map[ur.recipe_id] = ur;});
      setUserRecipes(map);
      if (userData.dietary_tags_profile?.length > 0) {
        setUserDietaryTags(userData.dietary_tags_profile);
      }
    }

    setLoading(false);
  };

  const dailyIds = useMemo(() => new Set(dailyRecipes.map((r) => r.id)), [dailyRecipes]);

  // All filtering is instant (in-memory) — no re-fetch on page/filter changes
  const filteredRecipes = useMemo(() => {
    const filtered = allOccasionRecipes.filter((r) => {
      if (showDaily && dailyIds.has(r.id)) return false;
      const matchesQuery = !query.trim() ||
      r.title?.toLowerCase().includes(query.toLowerCase()) ||
      r.description?.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = activeCategory === "Tutte" || r.category === activeCategory;
      const matchesDietary = !soloPerMe || userDietaryTags.length === 0 ||
      userDietaryTags.every((tag) => (r.dietary_tags || []).includes(tag));
      return matchesQuery && matchesCategory && matchesDietary;
    });

    // Sort: desbloqueadas primeiro, depois bloqueadas
    const accessible = getUserAccessibleOccasions(user);
    const isPremium = accessible.includes("ALL");

    return filtered.sort((a, b) => {
      const aBlocked = !isPremium && !accessible.some((occ) => (a.occasions || []).includes(occ) || (a.lifestyle || []).includes(occ));
      const bBlocked = !isPremium && !accessible.some((occ) => (b.occasions || []).includes(occ) || (b.lifestyle || []).includes(occ));
      return aBlocked - bBlocked;
    });
  }, [allOccasionRecipes, query, activeCategory, dailyIds, showDaily, soloPerMe, userDietaryTags, user]);

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  // Slice for current page — O(1), instant
  const pagedRecipes = filteredRecipes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQueryChange = (val) => {setQuery(val);setPage(1);};
  const handleCategoryChange = (cat) => {setActiveCategory(cat);setPage(1);};

  const icon = OCCASION_ICONS[occasion] || "🍽️";
  const totalCount = allOccasionRecipes.length;

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A1A1A] px-5 pt-12 pb-5 border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{occasion}</h1>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Collezione completa · {loading ? "…" : totalCount} ricette
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          {[
          { label: "Ricette", value: loading ? "…" : totalCount },
          { label: "Filtrate", value: loading ? "…" : filteredRecipes.length },
          { label: "Preferite", value: Object.keys(userRecipes).length }].
          map((s) =>
          <div key={s.label} className="flex-1 bg-gray-50 dark:bg-white/5 rounded-xl py-2 px-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca ricette..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#2D6A4F]" />
          
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
          {CATEGORY_PILLS.map((cat) =>
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            activeCategory === cat ?
            "bg-[#2D6A4F] text-white border-[#2D6A4F]" :
            "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"}`
            }>
            
              {cat}
            </button>
          )}
        </div>

        {/* Solo per me toggle — only show if user has dietary tags */}
        {userDietaryTags.length > 0 &&
        <button
          onClick={() => {setSoloPerMe((v) => !v);setPage(1);}}
          className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
          soloPerMe ?
          "bg-[#2D6A4F] text-white border-[#2D6A4F]" :
          "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300"}`
          }>
          
            🎯 Solo per me
            {soloPerMe && <span className="text-[10px] opacity-80">({userDietaryTags.length} restrizioni)</span>}
          </button>
        }
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ?
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
          </div> :
        !isAccessible ?
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <Lock className="w-12 h-12 text-amber-500 mb-3" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Accesso Limitato</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Acquista un prodotto Gosto Puro per accedere a queste ricette.</p>
            <Link to={createPageUrl("Home")} className="px-4 py-2 bg-[#2D6A4F] text-white rounded-xl font-semibold text-sm">
              Scopri i Prodotti
            </Link>
          </div> :
        blockedRecipeId ?
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-6 max-w-sm">
              <Lock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">Ricetta Bloccata</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">Acquista un prodotto Gosto Puro per accedere a questa ricetta.</p>
              <div className="flex gap-2">
                <button onClick={() => setBlockedRecipeId(null)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-[#2A2A2A] text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm">
                  Chiudi
                </button>
                <Link to={createPageUrl("Home")} className="flex-1 px-4 py-2 bg-[#2D6A4F] text-white rounded-xl font-semibold text-sm text-center">
                  Scopri i Prodotti
                </Link>
              </div>
            </div>
          </div> :

        <>
            {/* Ricette del Giorno — only for Colazione, Pranzo, Cena */}
            {showDaily && dailyRecipes.length > 0 && !query && activeCategory === "Tutte" &&
          <div className="mb-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                  Ricette del Giorno 🍽️
                </h2>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
                  {dailyRecipes.map((recipe) =>
              <DailyRecipeCard
                key={recipe.id}
                recipe={recipe}
                isSaved={!!userRecipes[recipe.id]} />

              )}
                </div>
                <div className="mt-5 border-t border-gray-100 dark:border-[#2A2A2A]" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4 mb-3">
                  Tutte le ricette
                </p>
              </div>
          }

            {filteredRecipes.length === 0 ?
          <div className="text-center py-20">
                <p className="text-4xl mb-3">🍽️</p>
                <p className="text-gray-400 font-semibold">Nessuna ricetta trovata</p>
                {query && <p className="text-gray-500 text-sm mt-1">Prova a modificare la ricerca</p>}
              </div> :

          <>
                <p className="text-xs text-gray-400 mb-3">
                  Mostrando {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredRecipes.length)}–{Math.min(safePage * PAGE_SIZE, filteredRecipes.length)} di {filteredRecipes.length} ricette
                </p>
                <div className="space-y-3">
                   {pagedRecipes.map((recipe) => {
                const accessible = getUserAccessibleOccasions(user);
                const isPremium = accessible.includes("ALL");
                const isBlocked = !isPremium && !accessible.some((occ) => (recipe.occasions || []).includes(occ) || (recipe.lifestyle || []).includes(occ));

                return (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    occasion={occasion}
                    isSaved={!!userRecipes[recipe.id]}
                    user={user}
                    isBlocked={isBlocked}
                    onBlockedClick={() => setBlockedRecipeId(recipe.id)} />);


              })}
                 </div>

                {totalPages > 1 &&
            <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] text-sm font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed">
                
                      ← Anterior
                    </button>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {safePage} / {totalPages}
                    </span>
                    <button
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] text-sm font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed">
                
                      Próxima →
                    </button>
                  </div>
            }
              </>
          }
          </>
        }
      </div>
    </div>);

}

function DailyRecipeCard({ recipe, isSaved }) {
  const kcal = recipe.calorie ?? recipe.calories;
  return (
    <Link
      to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
      className="flex-shrink-0 w-44 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform">
      
      <div className="relative w-full h-28">
        <img
          src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=300"}
          alt={recipe.title}
          className="w-full h-full object-cover" />
        
        {isSaved &&
        <div className="absolute top-2 right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        }
        {kcal &&
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            🔥 {kcal} kcal
          </div>
        }
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {recipe.title}
        </p>
        {recipe.prep_time &&
        <p className="text-[10px] text-gray-400 mt-1">⏱ {recipe.prep_time} min</p>
        }
      </div>
    </Link>);

}

function RecipeCard({ recipe, occasion, isSaved, user, isBlocked, onBlockedClick }) {
  const kcal = recipe.calorie ?? recipe.calories;

  if (isBlocked) {
    return (
      <button
        onClick={onBlockedClick}
        className="flex gap-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm opacity-60 cursor-pointer w-full text-left">
        
        <div className="w-24 flex-shrink-0 relative self-stretch">
          <img
            src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=200"}
            alt={recipe.title}
            className="w-full h-full object-cover" />
          
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Lock className="w-6 h-6 text-white" />
          </div>
        </div>

      <div className="flex-1 py-3 pr-3 min-w-0">
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          <span className="text-[10px] font-bold bg-[#2D6A4F]/30 text-[#52b788] px-2 py-0.5 rounded-full">
            {occasion}
          </span>
          {recipe.category && recipe.category !== occasion &&
            <span className="text-[10px] font-bold bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full">
              {recipe.category}
            </span>
            }
        </div>

        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1.5"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {recipe.title}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
          {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
          {kcal && <span>🔥 {kcal} kcal</span>}
          {recipe.difficulty && <span>{recipe.difficulty}</span>}
          {recipe.media_rating &&
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {recipe.media_rating}
            </span>
            }
        </div>

        {(recipe.dietary_tags || []).length > 0 &&
          <div className="flex gap-1 flex-wrap">
            {recipe.dietary_tags.slice(0, 3).map((tag) =>
            <span
              key={tag}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${DIETARY_TAG_COLORS[tag] || "bg-gray-800 text-gray-400"}`}>
              
                {tag}
              </span>
            )}
          </div>
          }
      </div>
      </button>);

  }

  return (
    <Link
      to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
      className="flex gap-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm">
      
      <div className="w-24 flex-shrink-0 relative self-stretch">
      <img
          src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=200"}
          alt={recipe.title}
          className="w-full h-full object-cover" />
        
      {isSaved &&
        <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
           <Heart className="w-3 h-3 text-white fill-white" />
         </div>
        }
       </div>

       <div className="flex-1 py-3 pr-3 min-w-0">
         <div className="flex gap-1.5 flex-wrap mb-1.5">
           <span className="bg-transparent text-gray-900 px-2 py-0.5 font-bold rounded-full">
             {occasion}
           </span>
           {recipe.category && recipe.category !== occasion &&
          <span className="text-[10px] font-bold bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full">
               {recipe.category}
             </span>
          }
         </div>

         <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1.5"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
           {recipe.title}
         </p>

         <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
           {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
           {kcal && <span>🔥 {kcal} kcal</span>}
           {recipe.difficulty && <span>{recipe.difficulty}</span>}
           {recipe.media_rating &&
          <span className="flex items-center gap-0.5">
               <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
               {recipe.media_rating}
             </span>
          }
         </div>

         {(recipe.dietary_tags || []).length > 0 &&
        <div className="flex gap-1 flex-wrap">
             {recipe.dietary_tags.slice(0, 3).map((tag) =>
          <span
            key={tag}
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${DIETARY_TAG_COLORS[tag] || "bg-gray-800 text-gray-400"}`}>
            
                 {tag}
               </span>
          )}
           </div>
        }
       </div>
      </Link>);

}