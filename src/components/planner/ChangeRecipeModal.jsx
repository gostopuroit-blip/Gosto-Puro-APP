import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

const OCCASIONS = [
  "Colazione", "Pranzo", "Cena", "Fit", "Detox", "Low carb",
  "Senza zucchero", "Proteiche", "365 Ricette Deliziose per Diabetici",
  "275 Ricette Fitness", "Instagram"
];

const PAGE_SIZE = 10;

export default function ChangeRecipeModal({ open, onOpenChange, mealType, onSelect }) {
  const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[0]);
  const [search, setSearch] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    fetchRecipes(selectedOccasion, "");
    setSearch("");
  }, [open, selectedOccasion]);

  // Set default occasion based on mealType
  useEffect(() => {
    if (!open) return;
    const defaults = { colazione: "Colazione", pranzo: "Pranzo", cena: "Cena", snack: "Fit" };
    setSelectedOccasion(defaults[mealType] || "Colazione");
  }, [open, mealType]);

  const fetchRecipes = async (occasion, query) => {
    setLoading(true);
    const results = await base44.entities.Recipe.filter(
      { status: "pubblicata" },
      "-created_date",
      200
    );
    setRecipes(results);
    setLoading(false);
  };

  const filtered = recipes.filter(r => {
    const matchesOccasion =
      (r.occasions || []).some(o => o.toLowerCase().includes(selectedOccasion.toLowerCase())) ||
      (r.lifestyle || []).some(o => o.toLowerCase().includes(selectedOccasion.toLowerCase())) ||
      (r.dietary_tags || []).some(o => o.toLowerCase().includes(selectedOccasion.toLowerCase())) ||
      (r.category || "").toLowerCase().includes(selectedOccasion.toLowerCase());

    const matchesSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase());

    return matchesOccasion && matchesSearch;
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const handleOccasionChange = (occ) => {
    setSelectedOccasion(occ);
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <DialogTitle>Scegli una ricetta</DialogTitle>
        </DialogHeader>

        {/* Occasion pills */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {OCCASIONS.map(occ => (
              <button
                key={occ}
                onClick={() => handleOccasionChange(occ)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedOccasion === occ
                    ? "bg-[#2D6A4F] text-white"
                    : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-700 dark:text-gray-300"
                }`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca ricetta..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#2D6A4F]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Nessuna ricetta trovata</p>
          ) : (
            <div className="space-y-2">
              {paginated.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => { onSelect(recipe); onOpenChange(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-[#222222] text-left transition-all"
                >
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-[#2A2A2A] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {recipe.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {recipe.prep_time ? `⏱ ${recipe.prep_time} min` : ""}
                      {recipe.prep_time && (recipe.calorie || recipe.calories) ? " · " : ""}
                      {(recipe.calorie || recipe.calories) ? `${recipe.calorie || recipe.calories} kcal` : ""}
                    </p>
                  </div>
                </button>
              ))}
              {hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full py-3 text-sm font-semibold text-[#2D6A4F] dark:text-[#40916C] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] rounded-xl transition-all"
                >
                  Carica altri
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}