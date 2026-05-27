import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";
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
    const q = params.get("search") || "";
    // Restore page from sessionStorage if URL doesn't have it (e.g. back navigation without page param)
    const urlPage = params.get("page");
    const savedPage = parseInt(sessionStorage.getItem("recipes_page") || "1", 10);
    const page = urlPage ? parseInt(urlPage, 10) : savedPage;
    setActiveTags({ occasion: occ || null, lifestyle: life || null });
    setCurrentPage(page);
    setSearch(q);
  }, [location.search]);

  useEffect(() => {
    loadRecipes();
  }, []);

  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Carrega freeIds e user uma vez
  const loadRecipes = async () => {
    const [freeRecipes, currentUser] = await Promise.all([
      base44.entities.FreeRecipe.list("-created_date", 500),
      base44.auth.me().catch(() => null),
    ]);
    setFreeIds(freeRecipes.map((r) => r.recipe_id));
    setUser(currentUser);
  };

  // Constants used by both query e UI
  const FREE_CATEGORIES_LIST = ["Colazione", "Pranzo", "Cena"];
  const GP_PROD_OCC = new Set([
    "Senza zucchero", "Low carb", "Detox", "Fit",
    "Ricette Sane", "Veloci", "Friggitrice ad Aria", "Facili da Congelare",
    "275 Ricette Fitness Pratiche ed Economiche",
    "365 Ricette Deliziose per Diabetici",
  ]);
  const OCC_ALIASES = {
    "365 Ricette Deliziose per Diabetici": ["Diabete", "365 Ricette Deliziose per Diabetici"],
    "275 Ricette Fitness Pratiche ed Economiche": ["Fit", "275 Ricette Fitness Pratiche ed Economiche"],
  };

  // Fetch paginado e filtrado no servidor — re-roda quando qualquer filtro muda
  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      const RECIPE_COLS = "id,title,image_url,prep_time,calories,paese,category,description,media_rating,rating_count,numero_salvate,numero_preparate,occasions,lifestyle,dietary_tags,status,created_at";
      let q = supabase.from("recipes").select(RECIPE_COLS, { count: "exact" }).eq("status", "pubblicata");

      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%,()]/g, "");
        q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%`);
      }

      const applyOccasionLike = (tag) => {
        if (!tag) return;
        if (FREE_CATEGORIES_LIST.includes(tag)) {
          q = q.eq("category", tag);
        } else if (GP_PROD_OCC.has(tag)) {
          const terms = OCC_ALIASES[tag] || [tag];
          q = q.overlaps("occasions", terms);
        } else {
          const term = tag.replace(/"/g, '\\"');
          q = q.or(`occasions.cs.{"${term}"},lifestyle.cs.{"${term}"}`);
        }
      };
      applyOccasionLike(activeTags.occasion);
      applyOccasionLike(activeTags.lifestyle);

      if (activeFilters.has("veloci")) q = q.lte("prep_time", 15);

      const userDietaryTags = user?.dietary_tags_profile || [];
      if (soloPerMe && userDietaryTags.length > 0) {
        q = q.overlaps("dietary_tags", userDietaryTags);
      }

      if (activeFilters.has("valutate")) q = q.order("media_rating", { ascending: false, nullsFirst: false });
      else if (activeFilters.has("preparate")) q = q.order("numero_preparate", { ascending: false, nullsFirst: false });
      else if (activeFilters.has("salvate")) q = q.order("numero_salvate", { ascending: false, nullsFirst: false });
      else q = q.order("created_at", { ascending: false });

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      q = q.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, count, error } = await q;
      if (!error) {
        setRecipes(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    };
    fetchPage();
  }, [debouncedSearch, activeFilters, activeTags, soloPerMe, currentPage, user]);



  const isPremium = user?.role === "admin" || user?.role === "premium" || user?.role === "basic" || user?.plan === "premium" || user?.plan === "basic" || user?.is_expert === true;

  // Filtros/ordenação/paginação são server-side (ver useEffect acima).
  // filteredRecipes/orderedRecipes/paginatedRecipes apenas espelham `recipes` para o JSX abaixo.
  const filteredRecipes = recipes;

  const clearTag = (type) => {
    setActiveTags((prev) => ({ ...prev, [type]: null }));
  };

  const goToPage = (page) => {
    sessionStorage.setItem("recipes_page", page);
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



  // Reorder free → locked apenas na página atual (não-premium sem compras)
  const hasPurchases = isPremium || (user?.purchased_products && user.purchased_products.length > 0);
  const orderedRecipes = useMemo(() => {
    if (hasPurchases) return recipes;
    const free = recipes.filter((r) => freeIds.includes(r.id));
    const locked = recipes.filter((r) => !freeIds.includes(r.id));
    return [...free, ...locked];
  }, [recipes, hasPurchases, freeIds]);

  const paginatedRecipes = orderedRecipes;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

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