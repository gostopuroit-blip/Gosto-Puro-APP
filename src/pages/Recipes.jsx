import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import RecipeCard from "@/components/RecipeCard";
import PullToRefresh from "@/components/PullToRefresh";
import { Search, SlidersHorizontal, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";

const filters = [
  { key: "all", label: "Tutte" },
  { key: "salvate", label: "Più salvate" },
  { key: "preparate", label: "Più preparate" },
  { key: "veloci", label: "Veloci" },
  { key: "valutate", label: "Meglio valutate" },
];

const RECIPES_PER_PAGE = 6;

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [activeTags, setActiveTags] = useState({ occasion: null, lifestyle: null });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const occ = params.get("occasion");
    const life = params.get("lifestyle");
    if (occ || life) {
      setActiveTags({ occasion: occ, lifestyle: life });
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    const data = await base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", 200);
    setRecipes(data);
    setLoading(false);
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
          (r.category || "").toLowerCase().includes(q)
      );
    }

    // Tags
    if (activeTags.occasion) {
      result = result.filter(
        (r) => r.occasions && r.occasions.includes(activeTags.occasion)
      );
    }
    if (activeTags.lifestyle) {
      result = result.filter(
        (r) => r.lifestyle && r.lifestyle.includes(activeTags.lifestyle)
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
    setCurrentPage(1);
  };

  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * RECIPES_PER_PAGE;
    const end = start + RECIPES_PER_PAGE;
    return filteredRecipes.slice(start, end);
  }, [filteredRecipes, currentPage]);

  const totalPages = Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadRecipes}>
      <div className="pb-4">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ricette</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Sane, facili e deliziose</p>
      </div>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-300" />
          <input
            type="text"
            placeholder="Cerca ricette sane…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/30 transition-all"
          />
        </div>
      </div>

      {/* Active Tags */}
      {(activeTags.occasion || activeTags.lifestyle) && (
        <div className="px-5 mb-3 flex gap-2">
          {activeTags.occasion && (
            <button
              onClick={() => clearTag("occasion")}
              className="flex items-center gap-1.5 bg-[#2D6A4F]/10 text-[#2D6A4F] px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              {activeTags.occasion}
              <X className="w-3 h-3" />
            </button>
          )}
          {activeTags.lifestyle && (
            <button
              onClick={() => clearTag("lifestyle")}
              className="flex items-center gap-1.5 bg-[#2D6A4F]/10 text-[#2D6A4F] px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              {activeTags.lifestyle}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => toggleFilter(f.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeFilters.has(f.key)
                ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                : "bg-white text-gray-500 border border-gray-100 hover:border-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Recipe List */}
      <div className="px-5 space-y-4">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🍳</p>
            <p className="text-gray-400 text-sm">Nessuna ricetta trovata</p>
          </div>
        ) : (
          paginatedRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))
        )}
      </div>

       {/* Pagination */}
       {filteredRecipes.length > 0 && (
         <div className="px-5 mt-8 mb-4 flex items-center justify-between">
           <button
             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
             disabled={currentPage === 1}
             className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
           >
             <ChevronLeft className="w-4 h-4" />
             Precedente
           </button>
           <span className="text-sm text-gray-500">
             Pagina {currentPage} di {totalPages}
           </span>
           <button
             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
             disabled={currentPage === totalPages}
             className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
           >
             Prossima
             <ChevronRight className="w-4 h-4" />
           </button>
         </div>
       )}

      </div>
    </PullToRefresh>
  );
}