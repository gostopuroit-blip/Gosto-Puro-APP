import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const TAG_COLORS = {
  "Vegano": "bg-green-100 text-green-700",
  "Vegetariano": "bg-lime-100 text-lime-700",
  "Senza glutine": "bg-yellow-100 text-yellow-700",
  "Low carb": "bg-blue-100 text-blue-700",
  "Economico": "bg-orange-100 text-orange-700",
  "Alta proteina": "bg-purple-100 text-purple-700",
};

const ALL_FILTER_TAGS = ["Tutti", "Vegano", "Vegetariano", "Senza glutine", "Low carb", "Economico", "Alta proteina"];

export default function RecipeSostituzioni({ recipe, userRecipe, recipeId, onSaved }) {
  const sostituzioni = recipe.sostituzioni || [];
  const ingredientiSenza = (recipe.ingredients || []).filter(
    (ing) => !sostituzioni.find((s) => s.ingrediente_nome === ing.name)
  );

  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState(() => {
    const init = {};
    (userRecipe?.sostituzioni_applicate || []).forEach((s) => {
      init[s.ingrediente_nome] = s.sostituto_scelto;
    });
    return init;
  });
  const [filterTag, setFilterTag] = useState("Tutti");
  const [saving, setSaving] = useState(false);

  const toggleExpand = (nome) => setExpanded((e) => ({ ...e, [nome]: !e[nome] }));

  const selectSostituto = (ingNome, optNome) => {
    setSelected((s) => {
      if (s[ingNome] === optNome) {
        const copy = { ...s };
        delete copy[ingNome];
        return copy;
      }
      return { ...s, [ingNome]: optNome };
    });
  };

  // Calcola impatto totale
  const impatto = { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 };
  sostituzioni.forEach((sost) => {
    const chosenNome = selected[sost.ingrediente_nome];
    if (!chosenNome) return;
    const opt = (sost.opzioni || []).find((o) => o.nome === chosenNome);
    if (!opt) return;
    impatto.calorie += opt.impatto_calorie || 0;
    impatto.proteine += opt.impatto_proteine || 0;
    impatto.carboidrati += opt.impatto_carboidrati || 0;
    impatto.grassi += opt.impatto_grassi || 0;
  });

  const formatImpatto = (val) => {
    if (!val) return "0";
    return (val > 0 ? "+" : "") + val;
  };

  const handleApplica = async () => {
    setSaving(true);
    const sostituzioni_applicate = Object.entries(selected).map(([ingrediente_nome, sostituto_scelto]) => ({
      ingrediente_nome,
      sostituto_scelto,
    }));
    if (userRecipe) {
      await base44.entities.UserRecipe.update(userRecipe.id, { sostituzioni_applicate });
    } else {
      await base44.entities.UserRecipe.create({ recipe_id: recipeId, sostituzioni_applicate });
    }
    setSaving(false);
    toast.success("Sostituzioni salvate! ✅");
    if (onSaved) onSaved();
  };

  const handleRipristina = async () => {
    setSaving(true);
    setSelected({});
    if (userRecipe) {
      await base44.entities.UserRecipe.update(userRecipe.id, { sostituzioni_applicate: [] });
    }
    setSaving(false);
    toast.success("Ingredienti originali ripristinati.");
    if (onSaved) onSaved();
  };

  // Filtra sostituzioni per tag
  const sostituzioniFiltered = filterTag === "Tutti"
    ? sostituzioni
    : sostituzioni.filter((sost) =>
        (sost.opzioni || []).some((opt) => (opt.tags || []).includes(filterTag))
      );

  return (
    <div className="mt-4 pb-32">
      {/* Avviso */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4 text-xs text-amber-700 leading-relaxed">
        💡 Tocca un ingrediente per vedere le opzioni di sostituzione. I macros si aggiornano in tempo reale.
      </div>

      {/* Filtri tag */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4 -mx-1 px-1">
        {ALL_FILTER_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(tag)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filterTag === tag
                ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                : "bg-white border-gray-100 text-gray-500"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Lista con sostituzioni */}
      <div className="space-y-2">
        {sostituzioniFiltered.map((sost) => {
          const isOpen = expanded[sost.ingrediente_nome];
          const chosenNome = selected[sost.ingrediente_nome];
          const opzioniFiltrate = filterTag === "Tutti"
            ? (sost.opzioni || [])
            : (sost.opzioni || []).filter((o) => (o.tags || []).includes(filterTag));

          return (
            <div key={sost.ingrediente_nome} className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
              <button
                onClick={() => toggleExpand(sost.ingrediente_nome)}
                className="w-full flex items-center justify-between px-4 py-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800">{sost.ingrediente_nome}</span>
                  {chosenNome && (
                    <span className="text-[10px] bg-[#2D6A4F]/10 text-[#2D6A4F] font-semibold px-2 py-0.5 rounded-full">
                      → {chosenNome}
                    </span>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                  {opzioniFiltrate.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Nessuna opzione per questo filtro.</p>
                  )}
                  {opzioniFiltrate.map((opt) => {
                    const isSelected = chosenNome === opt.nome;
                    return (
                      <button
                        key={opt.nome}
                        onClick={() => selectSostituto(sost.ingrediente_nome, opt.nome)}
                        className={`w-full text-left rounded-xl p-3 border transition-all ${
                          isSelected
                            ? "border-[#2D6A4F] bg-[#2D6A4F]/5"
                            : "border-gray-100 bg-gray-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? "border-[#2D6A4F] bg-[#2D6A4F]" : "border-gray-300"
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-sm font-semibold text-gray-800">{opt.nome}</span>
                              {opt.quantita && (
                                <span className="text-xs text-gray-400">{opt.quantita}</span>
                              )}
                            </div>
                            {(opt.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 ml-6 mb-1">
                                {opt.tags.map((tag) => (
                                  <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[tag] || "bg-gray-100 text-gray-500"}`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-[10px] space-y-0.5 flex-shrink-0">
                            {opt.impatto_calorie !== 0 && opt.impatto_calorie != null && (
                              <div className={opt.impatto_calorie > 0 ? "text-red-500" : "text-green-600"}>
                                {formatImpatto(opt.impatto_calorie)} kcal
                              </div>
                            )}
                            {opt.impatto_proteine !== 0 && opt.impatto_proteine != null && (
                              <div className={opt.impatto_proteine > 0 ? "text-blue-500" : "text-gray-400"}>
                                {formatImpatto(opt.impatto_proteine)}g prot
                              </div>
                            )}
                            {opt.impatto_carboidrati !== 0 && opt.impatto_carboidrati != null && (
                              <div className={opt.impatto_carboidrati > 0 ? "text-orange-500" : "text-green-600"}>
                                {formatImpatto(opt.impatto_carboidrati)}g carb
                              </div>
                            )}
                            {opt.impatto_grassi !== 0 && opt.impatto_grassi != null && (
                              <div className={opt.impatto_grassi > 0 ? "text-red-400" : "text-green-600"}>
                                {formatImpatto(opt.impatto_grassi)}g gras
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ingredienti senza sostituzioni */}
      {ingredientiSenza.length > 0 && filterTag === "Tutti" && (
        <div className="mt-4">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">
            Senza sostituzioni
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
            {ingredientiSenza.map((ing, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3 text-sm ${
                  i < ingredientiSenza.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <span className="text-gray-600">{ing.name}</span>
                <span className="text-gray-400 text-xs">{ing.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra impatto */}
      {Object.keys(selected).length > 0 && (
        <div className="mt-4 bg-gray-900 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">
            Impatto totale selezionato
          </p>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "kcal", val: impatto.calorie },
              { label: "prot", val: impatto.proteine },
              { label: "carb", val: impatto.carboidrati },
              { label: "gras", val: impatto.grassi },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center gap-1">
                <span className={`text-sm font-bold ${val > 0 ? "text-red-400" : val < 0 ? "text-green-400" : "text-gray-400"}`}>
                  {formatImpatto(val)}
                </span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottoni */}
      <div className="mt-4 space-y-2">
        <Button
          onClick={handleApplica}
          disabled={saving || Object.keys(selected).length === 0}
          className="w-full py-5 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold text-sm disabled:opacity-50"
        >
          <Check className="w-4 h-4 mr-2" />
          Applica Sostituzioni
        </Button>
        <Button
          onClick={handleRipristina}
          disabled={saving}
          variant="outline"
          className="w-full py-5 rounded-2xl border-2 font-bold text-sm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Ripristina Originale
        </Button>
      </div>
    </div>
  );
}