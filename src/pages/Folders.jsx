import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, FolderHeart, Search, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const systemFolders = [
  { key: "per_fare", label: "Per fare", icon: "📋" },
  { key: "fatte", label: "Fatte", icon: "✅" },
  { key: "preferite", label: "Preferite", icon: "❤️" },
  { key: "valutate", label: "Più valutate", icon: "⭐" },
];

export default function Folders() {
  const [expandedFolder, setExpandedFolder] = useState(null);
  const [userRecipes, setUserRecipes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [customFolders, setCustomFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [ur, r, f] = await Promise.all([
      base44.entities.UserRecipe.list("-created_date", 200),
      base44.entities.Recipe.list("-numero_preparate", 200),
      base44.entities.Folder.filter({ is_system: false }),
    ]);
    setUserRecipes(ur);
    setRecipes(r);
    setCustomFolders(f.filter(folder => !folder.is_system));
    setLoading(false);
  };

  const getRecipeById = (id) => recipes.find((r) => r.id === id);

  const getRecipesInFolder = (folderId) => {
    let filtered = [];
    switch (folderId) {
      case "per_fare":
        filtered = userRecipes.filter((ur) => ur.is_saved && ur.status === "per_fare");
        break;
      case "fatte":
        filtered = userRecipes.filter((ur) => ur.is_prepared || ur.status === "fatta");
        break;
      case "preferite":
        filtered = userRecipes.filter((ur) => ur.is_favorite);
        break;
      case "valutate":
        filtered = userRecipes.filter((ur) => ur.user_rating >= 4);
        filtered.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
        break;
      default:
        filtered = userRecipes.filter(
          (ur) => ur.folder_ids && ur.folder_ids.includes(folderId)
        );
        break;
    }
    return filtered.map((ur) => ({ ur, recipe: getRecipeById(ur.recipe_id) })).filter((x) => x.recipe);
  };

  const addRecipeToFolder = async (recipe, folderId) => {
    const existing = userRecipes.find((u) => u.recipe_id === recipe.id);
    if (folderId === "per_fare") {
      if (existing) {
        await base44.entities.UserRecipe.update(existing.id, { is_saved: true, status: "per_fare" });
      } else {
        await base44.entities.UserRecipe.create({ recipe_id: recipe.id, is_saved: true, status: "per_fare" });
      }
    } else if (folderId === "fatte") {
      if (existing) {
        await base44.entities.UserRecipe.update(existing.id, { is_prepared: true, status: "fatta" });
      } else {
        await base44.entities.UserRecipe.create({ recipe_id: recipe.id, is_prepared: true, status: "fatta" });
      }
    } else if (folderId === "preferite") {
      if (existing) {
        await base44.entities.UserRecipe.update(existing.id, { is_favorite: true });
      } else {
        await base44.entities.UserRecipe.create({ recipe_id: recipe.id, is_favorite: true });
      }
    } else {
      // custom folder
      const currentFolderIds = existing?.folder_ids || [];
      if (!currentFolderIds.includes(folderId)) {
        const newFolderIds = [...currentFolderIds, folderId];
        if (existing) {
          await base44.entities.UserRecipe.update(existing.id, { folder_ids: newFolderIds });
        } else {
          await base44.entities.UserRecipe.create({ recipe_id: recipe.id, folder_ids: newFolderIds });
        }
      }
    }
    toast.success("Ricetta aggiunta!");
    await loadData();
  };

  const removeRecipeFromFolder = async (recipeId, folderId) => {
    const ur = userRecipes.find((u) => u.recipe_id === recipeId);
    if (!ur) return;
    if (folderId === "per_fare") {
      await base44.entities.UserRecipe.update(ur.id, { is_saved: false });
    } else if (folderId === "fatte") {
      await base44.entities.UserRecipe.update(ur.id, { is_prepared: false, status: "per_fare" });
    } else if (folderId === "preferite") {
      await base44.entities.UserRecipe.update(ur.id, { is_favorite: false });
    } else {
      const newFolderIds = (ur.folder_ids || []).filter((id) => id !== folderId);
      await base44.entities.UserRecipe.update(ur.id, { folder_ids: newFolderIds });
    }
    toast.success("Ricetta rimossa");
    await loadData();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await base44.entities.Folder.create({ name: newFolderName.trim(), icon: "📁", is_system: false });
    setNewFolderName("");
    setShowNewFolder(false);
    toast.success("Cartella creata!");
    loadData();
  };

  const filteredSearch = recipes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Le mie cartelle</h1>
            <p className="text-sm text-gray-400 mt-0.5">Organizza le tue ricette</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => { setShowAddRecipe(true); setSearchQuery(""); }}
              size="sm"
              variant="outline"
              className="rounded-xl"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowNewFolder(true)}
              size="sm"
              className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]"
            >
              <FolderHeart className="w-4 h-4 mr-1" />
              Nuova
            </Button>
          </div>
        </div>
      </div>

      {/* Folder Grid */}
      <div className="px-5 space-y-3">
        {systemFolders.map((f) => {
          const folderRecipes = getRecipesInFolder(f.key);
          const isExpanded = expandedFolder === f.key;
          return (
            <div key={f.key} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedFolder(isExpanded ? null : f.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">{f.label}</p>
                    <p className="text-xs text-gray-500">{folderRecipes.length} ricette</p>
                  </div>
                </div>
                <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                  {folderRecipes.map(({ ur, recipe }) => (
                    <div key={recipe.id} className="rounded-xl overflow-hidden border border-gray-100">
                      {recipe.image_url && (
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-20 object-cover" />
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-700 line-clamp-2">{recipe.title}</p>
                        <button
                          onClick={() => removeRecipeFromFolder(recipe.id, f.key)}
                          className="text-xs text-red-500 mt-1 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> Rimuovi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {customFolders.map((f) => {
          const folderRecipes = getRecipesInFolder(f.id);
          const isExpanded = expandedFolder === f.id;
          return (
            <div key={f.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedFolder(isExpanded ? null : f.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon || "📁"}</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">{f.name}</p>
                    <p className="text-xs text-gray-500">{folderRecipes.length} ricette</p>
                  </div>
                </div>
                <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                  {folderRecipes.map(({ ur, recipe }) => (
                    <div key={recipe.id} className="rounded-xl overflow-hidden border border-gray-100">
                      {recipe.image_url && (
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-20 object-cover" />
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-700 line-clamp-2">{recipe.title}</p>
                        <button
                          onClick={() => removeRecipeFromFolder(recipe.id, f.id)}
                          className="text-xs text-red-500 mt-1 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> Rimuovi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Recipe Modal */}
      <Dialog open={showAddRecipe} onOpenChange={setShowAddRecipe}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Aggiungi ricetta</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <Input
              placeholder="Cerca ricetta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {filteredSearch.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Nessuna ricetta trovata</p>
            ) : (
              filteredSearch.map((recipe) => (
                <div key={recipe.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    {recipe.image_url && (
                      <img src={recipe.image_url} alt={recipe.title} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{recipe.title}</p>
                      <p className="text-xs text-gray-400">{recipe.category}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {systemFolders.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => { addRecipeToFolder(recipe, f.key); setShowAddRecipe(false); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#2D6A4F] hover:text-white transition"
                      >
                        {f.icon} {f.label}
                      </button>
                    ))}
                    {customFolders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { addRecipeToFolder(recipe, f.id); setShowAddRecipe(false); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#2D6A4F] hover:text-white transition"
                      >
                        {f.icon || "📁"} {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Nuova cartella</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome della cartella"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
          />
          <Button onClick={createFolder} className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]">
            Crea cartella
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}