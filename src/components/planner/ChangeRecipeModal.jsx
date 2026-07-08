import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { getUserAccessibleOccasions } from "@/hooks/useGetUserAccessibleOccasions";

const ALL_OCCASIONS = [
  "Colazione", "Pranzo", "Cena", "Leggera",
  "Fit", "Detox", "Low carb", "Senza zucchero",
  "Proteiche", "365 Ricette Deliziose per Diabetici",
  "275 Ricette Fitness Pratiche ed Economiche",
  "Veloci", "Friggitrice ad Aria", "Facili da Congelare", "Ricette Sane",
  "Instagram", "In famiglia", "Per due", "Con amici",
  "Estate", "Autunno", "Inverno", "Primavera"
];

// Ocasiões de produto cujo nome != tag interna (mesmo mapa da busca principal)
const OCC_ALIASES = {
  "365 Ricette Deliziose per Diabetici": ["Diabete", "365 Ricette Deliziose per Diabetici"],
  "275 Ricette Fitness Pratiche ed Economiche": ["Fit", "275 Ricette Fitness Pratiche ed Economiche"],
};

// Remove acentos e baixa caixa — alinha a query com a coluna `search_text` (também sem acento)
const deburr = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PAGE_SIZE = 12;

export default function ChangeRecipeModal({ open, onOpenChange, mealType, onSelect, user }) {
  const [selectedOccasion, setSelectedOccasion] = useState("Colazione");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const accessibleOccasions = getUserAccessibleOccasions(user);
  const isAllAccess = accessibleOccasions.includes("ALL");

  // Só mostra as ocasiões que o usuário tem acesso (as pills já restringem o conteúdo)
  const availableOccasions = isAllAccess
    ? ALL_OCCASIONS
    : ALL_OCCASIONS.filter((occ) => accessibleOccasions.includes(occ));

  // Define a ocasião padrão pelo tipo de refeição quando abre
  useEffect(() => {
    if (!open) return;
    const defaults = { colazione: "Colazione", pranzo: "Pranzo", cena: "Cena", snack: "Fit" };
    const defaultOcc = defaults[mealType] || "Colazione";
    const firstAccessible = availableOccasions.includes(defaultOcc)
      ? defaultOcc
      : availableOccasions[0] || "Colazione";
    setSelectedOccasion(firstAccessible);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }, [open, mealType]);

  // Debounce da busca (evita consultar a cada tecla)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Busca SERVER-SIDE no catálogo inteiro: filtra por ocasião (com aliases) + texto
  // robusto via coluna `search_text` (título + ingredientes + tag/ocasioni, sem acento),
  // paginado. Re-roda quando ocasião / busca / página mudam.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const terms = OCC_ALIASES[selectedOccasion] || [selectedOccasion];
      let q = supabase
        .from("recipes")
        .select("id,title,image_url,prep_time,calories,occasions,category,status")
        .eq("status", "pubblicata")
        .overlaps("occasions", terms);

      if (debouncedSearch && debouncedSearch.trim().length >= 2) {
        const tokens = deburr(debouncedSearch).replace(/[%,()]/g, " ").split(/\s+/).filter(Boolean).slice(0, 6);
        for (const t of tokens) q = q.ilike("search_text", `%${t}%`);
      }

      q = q.order("created_at", { ascending: false }).range(0, page * PAGE_SIZE - 1);

      const { data, error } = await q;
      if (cancelled) return;
      setLoading(false);
      const list = error ? [] : (data || []);
      setRecipes(list);
      setHasMore(list.length === page * PAGE_SIZE);
    };
    run();
    return () => { cancelled = true; };
  }, [open, selectedOccasion, debouncedSearch, page]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <DialogTitle>Scegli una ricetta</DialogTitle>
        </DialogHeader>

        {/* Ocasiões — só as acessíveis */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {availableOccasions.map((occ) => (
              <button
                key={occ}
                onClick={() => { setSelectedOccasion(occ); setPage(1); }}
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

        {/* Busca */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca in tutto il catalogo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D6A4F] animate-spin" />}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading && recipes.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#2D6A4F]" />
            </div>
          ) : recipes.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Nessuna ricetta trovata</p>
          ) : (
            <div className="space-y-2">
              {recipes.map((recipe) => (
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
                      {recipe.prep_time && recipe.calories ? " · " : ""}
                      {recipe.calories ? `${recipe.calories} kcal` : ""}
                    </p>
                  </div>
                </button>
              ))}
              {hasMore && (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="w-full py-3 text-sm font-semibold text-[#2D6A4F] dark:text-[#40916C] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] rounded-xl transition-all"
                >
                  Carica altre
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
