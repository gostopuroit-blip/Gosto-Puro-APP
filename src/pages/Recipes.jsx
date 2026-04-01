import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/components/useAnalytics";
import RecipeCard from "@/components/RecipeCard";
import PullToRefresh from "@/components/PullToRefresh";
import DailyRecipesSection from "@/components/DailyRecipesSection";
import { Search, SlidersHorizontal, Loader2, X, Lock, Crown } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const filters = [
{ key: "all", label: "Tutte" },
{ key: "salvate", label: "Più salvate" },
{ key: "preparate", label: "Più preparate" },
{ key: "veloci", label: "Veloci" },
{ key: "valutate", label: "Meglio valutate" }];


export default function Recipes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [activeTags, setActiveTags] = useState({ occasion: null, lifestyle: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [unlockedConfig, setUnlockedConfig] = useState(null);
  const [allRecipesLoaded, setAllRecipesLoaded] = useState(false);
  const pageRef = useRef(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const occ = params.get("occasion");
    const life = params.get("lifestyle");
    const page = parseInt(params.get("page") || "1", 10);
    const q = params.get("search") || "";
    setActiveTags({ occasion: occ || null, lifestyle: life || null });
    setCurrentPage(page);
    setSearch(q);
  }, [location.search]);

  useEffect(() => {
    loadRecipes(1);
    base44.auth.me().then(setUser).catch(() => setUser(null));
    loadUnlockedConfig();
  }, [loadRecipes]);

  const loadUnlockedConfig = async () => {
    try {
      const config = await base44.entities.AppConfig.filter({ key: "base_free_unlocked_ids_final" });
      if (config.length > 0) {
        const parsed = JSON.parse(config[0].value);
        setUnlockedConfig(parsed);
      }
    } catch (error) {
      console.error("Failed to load unlocked config:", error);
      setUnlockedConfig({});
    }
  };

  const loadRecipes = useCallback(async (page = 1) => {
    const pageSize = 20;
    const skip = (page - 1) * pageSize;
    const data = await base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", pageSize, skip).catch(() => []);

    if (page === 1) {
      setRecipes(data);
      setAllRecipesLoaded(data.length < pageSize);
    } else {
      setRecipes((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        const merged = [...prev, ...data.filter((r) => !ids.has(r.id))];
        return merged;
      });
      setAllRecipesLoaded(data.length < pageSize);
    }
    pageRef.current = page;
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Define constants before useMemo
  const FREE_CATEGORIES = ["Colazione", "Pranzo", "Cena"];
  const SPECIAL_OCCASIONS = ["Instagram", "Veloci", "Inverno", "Primavera", "Estate", "Autunno", "Capodanno", "Natale", "Dal mondo", "Leggera", "Dolci", "Proteiche", "Senza zucchero"];
  const LIFESTYLE_TAGS = ["Low carb", "Diabete", "Fitness", "Detox", "Vegan", "Vegetariano", "Proteiche", "Senza zucchero"];
  const FREE_OCCASIONS = ["Instagram", "Veloci", "Inverno", "Primavera", "Estate", "Autunno", "Capodanno", "Natale", "Dal mondo", "Leggera", "Dolci", "Proteiche", "Senza zucchero", "Low carb", "Diabete", "Fitness", "Detox", "Vegan", "Vegetariano", "Con amici", "Festeggiare", "Romantico", "Famiglia"];
  const isPremium = user?.plan === "premium" || user?.role === "admin" || user?.role === "premium" || user?.subscription_level === "premium";

  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }

    // Tags — filter by category for Colazione/Pranzo/Cena, or by occasions/lifestyle for others
    if (activeTags.occasion) {
      if (FREE_CATEGORIES.includes(activeTags.occasion)) {
        // Filter by category
        result = result.filter((r) => r.category === activeTags.occasion);
      } else {
        // Filter by occasions or lifestyle
        result = result.filter(
          (r) =>
          r.occasions && r.occasions.includes(activeTags.occasion) ||
          r.lifestyle && r.lifestyle.includes(activeTags.occasion)
        );
      }
    }
    if (activeTags.lifestyle) {
      result = result.filter(
        (r) =>
        r.lifestyle && r.lifestyle.includes(activeTags.lifestyle) ||
        r.occasions && r.occasions.includes(activeTags.lifestyle)
      );
    }

    // Apply sort filters (only one at a time — last active wins)
    const hasSort = activeFilters.has("salvate") || activeFilters.has("preparate") || activeFilters.has("valutate");
    if (activeFilters.has("valutate")) {
      result.sort((a, b) => (b.media_rating || 0) - (a.media_rating || 0));
    } else if (activeFilters.has("preparate")) {
      result.sort((a, b) => (b.numero_preparate || 0) - (a.numero_preparate || 0));
    } else if (activeFilters.has("salvate")) {
      result.sort((a, b) => (b.numero_salvate || 0) - (a.numero_salvate || 0));
    }

    if (activeFilters.has("veloci")) {
      result = result.filter((r) => r.prep_time <= 15);
    }

    return result;
  }, [recipes, search, activeFilters, activeTags]);

  const clearTag = (type) => {
    setActiveTags((prev) => ({ ...prev, [type]: null }));
  };

  const goToPage = (page) => {
    const params = new URLSearchParams(location.search);
    params.set("page", page);
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    navigate({ search: params.toString() }, { replace: true });
  };

  const toggleFilter = (filterKey) => {
    setActiveFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(filterKey)) {
        newFilters.delete(filterKey);
      } else {
        newFilters.add(filterKey);
      }
      return newFilters;
    });
    goToPage(1);
  };

  // Determine if current view is speciale/stile_vita
  const isSpecialView = activeTags.occasion && (SPECIAL_OCCASIONS.includes(activeTags.occasion) || LIFESTYLE_TAGS.includes(activeTags.occasion));

  // Unlock recipes based on static AppConfig
  const unlockedIds = useMemo(() => {
    if (isPremium || !unlockedConfig) return null;
    
    const ids = new Set();
    const activeTag = activeTags.occasion || activeTags.lifestyle;

    if (isSpecialView && activeTag && unlockedConfig[activeTag]) {
      // Use static list from AppConfig for speciale/stile_vita
      unlockedConfig[activeTag].forEach((id) => ids.add(id));
    } else if (!isSpecialView && activeTag && FREE_CATEGORIES.includes(activeTag) && unlockedConfig[activeTag]) {
      // Use static list from AppConfig for categories
      unlockedConfig[activeTag].forEach((id) => ids.add(id));
    }
    
    return ids;
  }, [unlockedConfig, isPremium, isSpecialView, activeTags]);

  // Keep filteredRecipes in natural order (most recent first)
  const orderedRecipes = filteredRecipes;

  // Infinite scroll
  const handleScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 500 && !loadingMore && !allRecipesLoaded) {
      setLoadingMore(true);
      loadRecipes(pageRef.current + 1);
    }
  }, [loadingMore, allRecipesLoaded, loadRecipes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>);

  }

  return (
    <PullToRefresh onRefresh={() => loadRecipes(1)}>
      <div className="pb-24" onScroll={handleScroll} style={{ height: '100vh', overflowY: 'auto' }}>
      {/* Header */}
      




       {/* Daily Recipes Section */}
       {activeTags.occasion && ["Colazione", "Pranzo", "Cena"].includes(activeTags.occasion) && user &&
        <DailyRecipesSection occasion={activeTags.occasion} user={user} />
        }

       {/* Search */}
       <div className="px-5 mb-4 mt-3">
         <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-300 dark:text-gray-600" />
           <input
              type="text"
              placeholder="Cerca ricette sane…"
              value={search}
              onChange={(e) => {
                 setSearch(e.target.value);
                }}
                onBlur={() => {
                  if (search.trim().length >= 2) {
                    trackEvent("recipe_search", { occasion_label: search.trim(), results_count: filteredRecipes.length });
                  }
                }}
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#2D3F35] rounded-2xl border border-gray-100 dark:border-[#3D5246] text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/30 transition-all" />

         </div>
       </div>

       {/* Active Tags */}
       {(activeTags.occasion || activeTags.lifestyle) &&
        <div className="px-5 mb-3 flex gap-2">
           {activeTags.occasion &&
          <button
            onClick={() => clearTag("occasion")}
            className="flex items-center gap-1.5 bg-[#2D6A4F]/10 text-[#2D6A4F] dark:bg-[#2D6A4F]/20 dark:text-[#40916C] px-3 py-1.5 rounded-full text-xs font-semibold">

               {activeTags.occasion}
               <X className="w-3 h-3" />
             </button>
          }
           {activeTags.lifestyle &&
          <button
            onClick={() => clearTag("lifestyle")}
            className="flex items-center gap-1.5 bg-[#2D6A4F]/10 text-[#2D6A4F] dark:bg-[#2D6A4F]/20 dark:text-[#40916C] px-3 py-1.5 rounded-full text-xs font-semibold">

               {activeTags.lifestyle}
               <X className="w-3 h-3" />
             </button>
          }
         </div>
        }

       {/* Filters */}
       <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-4">
         {filters.map((f) =>
          <button
            key={f.key}
            onClick={() => toggleFilter(f.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeFilters.has(f.key) ?
            "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20" :
            "bg-white dark:bg-[#2D3F35] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-[#3D5246] hover:border-gray-200 dark:hover:border-[#4D6456]"}`
            }>

             {f.label}
           </button>
          )}
       </div>

       {/* Recipe List */}
       <div className="px-5 space-y-4">
         {orderedRecipes.length === 0 ?
          <div className="text-center py-16">
             <p className="text-5xl mb-4">🍳</p>
             <p className="text-gray-400 dark:text-gray-500 text-sm">Nessuna ricetta trovata</p>
           </div> :
          <>
             {orderedRecipes.map((recipe) => {
              const isLocked = !isPremium && unlockedIds && !unlockedIds.has(recipe.id);
              if (isLocked) {
                return (
                  <a key={recipe.id} href="https://pay.hotmart.com/L104095305F?off=sk18i3wx&checkoutMode=10" target="_blank" rel="noopener noreferrer" className="block relative rounded-3xl overflow-hidden">
                     <div className="pointer-events-none select-none blur-[2px] opacity-40">
                       <RecipeCard recipe={recipe} />
                     </div>
                     <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                       <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                         <Lock className="w-5 h-5 text-amber-500" />
                       </div>
                       <p className="bg-zinc-50 text-slate-950 text-xs font-bold rounded drop-shadow">Ricetta Premium</p>
                       <span className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1">
                         <Crown className="w-3.5 h-3.5" /> Sblocca Premium
                       </span>
                     </div>
                   </a>);

              }
              return <RecipeCard key={recipe.id} recipe={recipe} />;
            })}
           {loadingMore && (
             <div className="flex items-center justify-center py-6">
               <Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" />
             </div>
           )}

           {allRecipesLoaded && orderedRecipes.length > 0 && (
             <div className="text-center py-8 text-gray-400 dark:text-gray-500">
               <p className="text-sm font-medium">Hai visto tutte le ricette! 🎉</p>
             </div>
           )}
           </>
           }
           </div>
       </div>
     </PullToRefresh>);

}