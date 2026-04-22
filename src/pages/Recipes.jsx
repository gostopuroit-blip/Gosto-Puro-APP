import { useState, useEffect, useMemo } from "react";
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
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [activeTags, setActiveTags] = useState({ occasion: null, lifestyle: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [freeIds, setFreeIds] = useState([]);
  const [soloPerMe, setSoloPerMe] = useState(false);
  const ITEMS_PER_PAGE = 6;

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
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    const [data, freeRecipes, currentUser] = await Promise.all([
      base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", 5000),
      base44.entities.FreeRecipe.list("-created_date", 500),
      base44.auth.me().catch(() => null),
    ]);
    setRecipes(data);
    setFreeIds(freeRecipes.map((r) => r.recipe_id));
    setUser(currentUser);
    setLoading(false);
  };



  // Define constants before useMemo
  const FREE_CATEGORIES = ["Colazione", "Pranzo", "Cena"];
  const isPremium = user?.role === "admin" || user?.role === "premium" || user?.role === "basic" || user?.plan === "premium" || user?.plan === "basic" || user?.is_expert === true;

  // Occasioni GP prodotto: buscar SOLO in occasions (non in dietary_tags/lifestyle)
  // Altrimenti ricette salate con dietary_tag "Senza zucchero" appaiono nella collezione dolci
  const GP_PRODUCT_OCCASIONS = new Set([
    "Senza zucchero", "Low carb", "Detox", "Fit",
    "Ricette Sane", "Veloci", "Friggitrice ad Aria", "Facili da Congelare",
    "275 Ricette Fitness Pratiche ed Economiche",
    "365 Ricette Deliziose per Diabetici",
  ]);

  // Aliases: occasione prodotto → labels antichi usati nelle ricette
  const OCCASION_ALIASES = {
    "365 Ricette Deliziose per Diabetici": ["Diabete", "365 Ricette Deliziose per Diabetici"],
    "275 Ricette Fitness Pratiche ed Economiche": ["Fit", "275 Ricette Fitness Pratiche ed Economiche"],
  };

  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q) ||
        (r.occasions || []).some((o) => o.toLowerCase().includes(q)) ||
        (r.lifestyle || []).some((l) => l.toLowerCase().includes(q)) ||
        (r.ingredients || []).some((i) => (i.name || "").toLowerCase().includes(q))
      );
    }

    // Tags — filter by category for Colazione/Pranzo/Cena, or by occasions only for GP products
    if (activeTags.occasion) {
      if (FREE_CATEGORIES.includes(activeTags.occasion)) {
        result = result.filter((r) => r.category === activeTags.occasion);
      } else if (GP_PRODUCT_OCCASIONS.has(activeTags.occasion)) {
        // GP product occasions: match ONLY in occasions (not dietary_tags/lifestyle to avoid false positives)
        const terms = OCCASION_ALIASES[activeTags.occasion] || [activeTags.occasion];
        result = result.filter((r) => terms.some(term => (r.occasions || []).includes(term)));
      } else {
        // Other occasions: match in occasions or lifestyle
        result = result.filter(
          (r) =>
          (r.occasions || []).includes(activeTags.occasion) ||
          (r.lifestyle || []).includes(activeTags.occasion)
        );
      }
    }
    if (activeTags.lifestyle) {
      if (GP_PRODUCT_OCCASIONS.has(activeTags.lifestyle)) {
        const terms = OCCASION_ALIASES[activeTags.lifestyle] || [activeTags.lifestyle];
        result = result.filter((r) => terms.some(term => (r.occasions || []).includes(term)));
      } else {
        result = result.filter(
          (r) =>
          (r.lifestyle || []).includes(activeTags.lifestyle) ||
          (r.occasions || []).includes(activeTags.lifestyle)
        );
      }
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

    // Solo per me: mostra solo ricette che hanno almeno una delle tag dietetiche del profilo
    const userDietaryTags = user?.dietary_tags_profile || [];
    if (soloPerMe && userDietaryTags.length > 0) {
      result = result.filter((r) =>
        userDietaryTags.some(tag => (r.dietary_tags || []).includes(tag))
      );
    }

    return result;
  }, [recipes, search, activeFilters, activeTags, soloPerMe, user]);

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



  // If user has any purchase or is premium: natural order. Otherwise: free first, locked after.
  const hasPurchases = isPremium || (user?.purchased_products && user.purchased_products.length > 0);
  const orderedRecipes = useMemo(() => {
    if (hasPurchases) return filteredRecipes;
    const free = filteredRecipes.filter((r) => freeIds.includes(r.id));
    const locked = filteredRecipes.filter((r) => !freeIds.includes(r.id));
    return [...free, ...locked];
  }, [filteredRecipes, hasPurchases, freeIds]);

  const paginatedRecipes = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return orderedRecipes.slice(startIdx, endIdx);
  }, [orderedRecipes, currentPage]);

  const totalPages = Math.ceil(orderedRecipes.length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>);

  }

  return (
    <PullToRefresh onRefresh={loadRecipes}>
      <div className="pb-4">
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
       <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-2">
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
          {(user?.dietary_tags_profile || []).length > 0 && (
            <button
              onClick={() => { setSoloPerMe(v => !v); goToPage(1); }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                soloPerMe
                  ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                  : "bg-white dark:bg-[#2D3F35] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-[#3D5246]"
              }`}
            >
              🎯 Solo per me
            </button>
          )}
       </div>
       <div className="pb-2" />

       {/* Recipe List */}
       <div className="px-5 space-y-4">
         {orderedRecipes.length === 0 ?
          <div className="text-center py-16">
             <p className="text-5xl mb-4">🍳</p>
             <p className="text-gray-400 dark:text-gray-500 text-sm">Nessuna ricetta trovata</p>
           </div> :
          <>
             {paginatedRecipes.map((recipe) => {
               const isFitOccasion = activeTags.occasion === "Fit" || activeTags.lifestyle === "Fit";
               const isLocked = !isPremium && !freeIds.includes(recipe.id) && !isFitOccasion;
               if (isLocked) {
                 return (
                   <a key={recipe.id} href="https://gostopuro.it/upgrade/" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("premium_click", { source: "recipe_list", recipe_id: recipe.id, recipe_title: recipe.title })} className="block relative rounded-3xl overflow-hidden">
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
           </>
          }
       </div>

       {/* Pagination */}
       {totalPages > 1 &&
        <div className="px-5 mt-8 pb-4 flex items-center justify-between">
           <button
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#3D5246] text-sm font-semibold text-gray-700 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#2D3F35] transition-colors">

             ← Indietro
           </button>
           <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
             Pagina {currentPage} di {totalPages}
           </span>
           <button
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#3D5246] text-sm font-semibold text-gray-700 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#2D3F35] transition-colors">

             Avanti →
           </button>
         </div>
        }
       </div>
     </PullToRefresh>);

}