import { useState, useEffect } from "react";
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


const FREE_CATEGORIES_CONST = ["Colazione", "Pranzo", "Cena"];
const ITEMS_PER_PAGE = 12;

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
  const [totalCount, setTotalCount] = useState(0);
  const [user, setUser] = useState(null);
  const [freeIds, setFreeIds] = useState([]);

  // Build DB filter based on active tags
  const buildFilter = (tags) => {
    const filter = { status: "pubblicata" };
    if (tags?.occasion) {
      if (FREE_CATEGORIES_CONST.includes(tags.occasion)) {
        filter.category = tags.occasion;
      } else {
        // occasions or lifestyle match — we'll fetch a broader set and filter client-side
        // but limit to 100 max for performance
      }
    }
    return filter;
  };

  // Load a specific page from the server
  const loadPage = async (page, tags, filters, q, currentFreeIds) => {
    const filter = { status: "pubblicata" };

    // Category filter (Colazione/Pranzo/Cena) can be sent to DB directly
    if (tags?.occasion && FREE_CATEGORIES_CONST.includes(tags.occasion)) {
      filter.category = tags.occasion;
    }

    // Sort based on active filters
    let sort = "-created_date";
    if (filters.has("valutate")) sort = "-media_rating";
    else if (filters.has("preparate")) sort = "-numero_preparate";
    else if (filters.has("salvate")) sort = "-numero_salvate";

    // For occasion/lifestyle tags that require array matching or search, we fetch more and filter client-side
    const needsClientFilter = (tags?.occasion && !FREE_CATEGORIES_CONST.includes(tags.occasion)) || tags?.lifestyle || q?.trim() || filters.has("veloci");

    if (needsClientFilter) {
      // Fetch up to 300 and filter client-side (much less than 5000)
      const data = await base44.entities.Recipe.filter(filter, sort, 300);
      let result = data;

      if (q?.trim()) {
        const ql = q.toLowerCase();
        result = result.filter(r =>
          r.title.toLowerCase().includes(ql) ||
          (r.description || "").toLowerCase().includes(ql) ||
          (r.category || "").toLowerCase().includes(ql) ||
          (r.occasions || []).some(o => o.toLowerCase().includes(ql)) ||
          (r.lifestyle || []).some(l => l.toLowerCase().includes(ql)) ||
          (r.ingredients || []).some(i => (i.name || "").toLowerCase().includes(ql))
        );
      }
      if (tags?.occasion && !FREE_CATEGORIES_CONST.includes(tags.occasion)) {
        result = result.filter(r =>
          (r.occasions && r.occasions.includes(tags.occasion)) ||
          (r.lifestyle && r.lifestyle.includes(tags.occasion))
        );
      }
      if (tags?.lifestyle) {
        result = result.filter(r =>
          (r.lifestyle && r.lifestyle.includes(tags.lifestyle)) ||
          (r.occasions && r.occasions.includes(tags.lifestyle))
        );
      }
      if (filters.has("veloci")) {
        result = result.filter(r => r.prep_time <= 15);
      }

      setTotalCount(result.length);
      const start = (page - 1) * ITEMS_PER_PAGE;
      return result.slice(start, start + ITEMS_PER_PAGE);
    } else {
      // Pure DB pagination — fast path
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const data = await base44.entities.Recipe.filter(filter, sort, ITEMS_PER_PAGE, skip);
      // For total count estimate, fetch one extra batch to know if there's more
      const countData = await base44.entities.Recipe.filter(filter, sort, 1000);
      setTotalCount(countData.length);
      return data;
    }
  };

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
    base44.auth.me().then(setUser).catch(() => setUser(null));
    base44.entities.FreeRecipe.list("-created_date", 500).then(r => setFreeIds(r.map(x => x.recipe_id)));
  }, []);

  // Reload when page/tags/filters/search change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const occ = params.get("occasion");
    const life = params.get("lifestyle");
    const page = parseInt(params.get("page") || "1", 10);
    const q = params.get("search") || "";
    const tags = { occasion: occ || null, lifestyle: life || null };

    setLoading(true);
    loadPage(page, tags, activeFilters, q, freeIds).then(data => {
      setRecipes(data);
      setLoading(false);
    });
  }, [location.search, activeFilters]);

  const loadRecipes = async () => {
    const params = new URLSearchParams(location.search);
    const occ = params.get("occasion");
    const life = params.get("lifestyle");
    const page = parseInt(params.get("page") || "1", 10);
    const q = params.get("search") || "";
    const tags = { occasion: occ || null, lifestyle: life || null };
    setLoading(true);
    const data = await loadPage(page, tags, activeFilters, q, freeIds);
    setRecipes(data);
    setLoading(false);
  };



  const isPremium = user?.role === "admin" || user?.role === "premium" || user?.plan === "premium" || user?.is_expert === true;

  const clearTag = (type) => {
    const params = new URLSearchParams(location.search);
    params.delete(type === "occasion" ? "occasion" : "lifestyle");
    params.set("page", "1");
    navigate({ search: params.toString() }, { replace: true });
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

  // recipes already paginated from server
  const orderedRecipes = recipes;
  const paginatedRecipes = recipes;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
                    trackEvent("recipe_search", { occasion_label: search.trim(), results_count: totalCount });
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
             {paginatedRecipes.map((recipe) => {
               const isLocked = !isPremium && !freeIds.includes(recipe.id);
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