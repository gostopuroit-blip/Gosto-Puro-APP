import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, Loader2, X, Save } from "lucide-react";
import { toast } from "sonner";

// Palavras suspeitas que indicam tradução errada
const SUSPICIOUS_WORDS = [
  "respiro", "osso", "alto", "fibra", "farina 00", "bone", "breath",
  "bone", "high", "fiber", "flour", "egg white", "clara", "tuorlo",
  "gall", "gallo", "gallina", "carne macinata",
  // Adicione outras palavras suspeitas aqui
];

export default function AdminRecipeIngredientAudit() {
  const [recipes, setRecipes] = useState([]);
  const [problematicRecipes, setProblematicRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const all = [];
        let skip = 0;
        const limit = 100;
        while (true) {
          const batch = await base44.entities.Recipe.list("-created_date", limit, skip);
          all.push(...batch);
          if (batch.length < limit) break;
          skip += limit;
        }
        setRecipes(all);

        // Encontra receitas com ingredientes suspeitos
        const problematic = all.filter((r) => {
          if (!r.ingredients) return false;
          return r.ingredients.some((ing) => {
            const name = (ing.name || "").toLowerCase();
            return SUSPICIOUS_WORDS.some((word) =>
              name.includes(word.toLowerCase())
            );
          });
        });

        setProblematicRecipes(problematic);
      } catch (err) {
        toast.error("Erro ao carregar receitas");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, []);

  const handleEditIngredient = (recipeId, ingredientIndex, currentName) => {
    setEditingId(`${recipeId}-${ingredientIndex}`);
    setEditValue(currentName);
  };

  const handleSaveIngredient = async (recipeId, ingredientIndex) => {
    if (!editValue.trim()) {
      toast.error("Nome do ingrediente não pode estar vazio");
      return;
    }

    setSaving(true);
    try {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) return;

      const updated = {
        ...recipe,
        ingredients: recipe.ingredients.map((ing, i) =>
          i === ingredientIndex ? { ...ing, name: editValue.trim() } : ing
        ),
      };

      await base44.entities.Recipe.update(recipeId, {
        ingredients: updated.ingredients,
      });

      // Atualiza state
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId ? updated : r
        )
      );
      setProblematicRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId ? updated : r
        )
      );

      setEditingId(null);
      setEditValue("");
      toast.success("Ingrediente atualizado!");
    } catch (err) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-yellow-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <p className="font-bold text-yellow-800">
            Auditoria de Ingredientes
          </p>
        </div>
        <p className="text-sm text-yellow-700">
          Total de receitas: {recipes.length} | Com problemas: {problematicRecipes.length}
        </p>
      </div>

      {problematicRecipes.length === 0 ? (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700 font-medium">
            ✓ Nenhuma receita com ingredientes suspeitos!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {problematicRecipes.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-2xl p-4 border border-yellow-100">
              <div className="mb-3">
                <p className="font-bold text-gray-900">{recipe.title}</p>
                <p className="text-xs text-gray-500">
                  ID: {recipe.id}
                </p>
              </div>

              <div className="space-y-2">
                {recipe.ingredients?.map((ing, idx) => {
                  const isSuspicious = SUSPICIOUS_WORDS.some((word) =>
                    ing.name?.toLowerCase().includes(word.toLowerCase())
                  );

                  if (!isSuspicious) return null;

                  const editKey = `${recipe.id}-${idx}`;
                  const isEditing = editingId === editKey;

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-yellow-300 rounded bg-yellow-50 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleSaveIngredient(recipe.id, idx)
                            }
                            disabled={saving}
                            className="px-2 py-1 text-xs bg-[#2D6A4F] text-white rounded hover:bg-[#235c43] disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            onClick={() => handleEditIngredient(recipe.id, idx, ing.name)}
                            className="flex-1 cursor-pointer hover:bg-yellow-100 p-1 rounded"
                          >
                            <p className="text-sm font-mono text-red-700">
                              "{ing.name}"
                            </p>
                            <p className="text-xs text-gray-500">
                              {ing.quantity} • {ing.category}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEditIngredient(recipe.id, idx, ing.name)}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 font-semibold"
                          >
                            Editar
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}