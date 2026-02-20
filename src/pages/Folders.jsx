import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, FolderHeart, Search, X, Trash2 } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";
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
  const [activeFolder, setActiveFolder] = useState("per_fare");
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

  const getRecipesInFolder = () => {
    let filtered = [];
    switch (activeFolder) {
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
          (ur) => ur.folder_ids && ur.folder_ids.includes(activeFolder)
        );
        break;
    }
    return filtered.map((ur) => ({ ur, recipe: getRecipeById(ur.recipe_id) })).filter((x) => x.recipe);
  };

  const isInCurrentFolder = (recipeId) => {
    const ur = userRecipes.find((u) => u.recipe_id === recipeId);
    if (!ur) return false;
    switch (activeFolder) {
      case "per_fare": return ur.is_saved && ur.status === "per_fare";
      case "fatte": return ur.is_prepared || ur.status === "fatta";
      case "preferite": return ur.is_favorite;
      case "valutate": return (ur.user_rating || 0) >= 4;
      default: return ur.folder_ids && ur.folder_ids.includes(activeFolder);
    }
  };

  const addRecipeToFolder = async (recipe) => {
    const existing = userRecipes.find((u) => u.recipe_id === recipe.id);
    if (activeFolder === "per_fare") {
      if (existing) {
        await base44.entities.UserRecipe.update(existing.id, { is_saved: true, status: "per_fare" });
      } else {
        await base44.entities.UserRecipe.create({ recipe_id: recipe.id, is_saved: true, status: "per_fare" });
      }
    } else if (activeFolder === "fatte") {
      if (existing) {
        await base44.entities.UserRecipe.update(existing.id, { is_prepared: true, status: "fatta" });
      } else {
        await base44.entities.UserRecipe.create({ recipe_id: recipe.id, is_prepared: true, status: "fatta" });
      }
    } else if (activeFolder === "preferite") {
      if (existing) {
        await base44.entities.UserRecipe.update(existing.id, { is_favorite: true });
      } else {
        await base44.entities.UserRecipe.create({ recipe_id: recipe.id, is_favorite: true });
      }
    } else {
      // custom folder
      const currentFolderIds = existing?.folder_ids || [];
      if (!currentFolderIds.includes(activeFolder)) {
        const newFolderIds = [...currentFolderIds, activeFolder];
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

  const removeRecipeFromFolder = async (recipeId) => {
    const ur = userRecipes.find((u) => u.recipe_id === recipeId);
    if (!ur) return;
    if (activeFolder === "per_fare") {
      await base44.entities.UserRecipe.update(ur.id, { is_saved: false });
    } else if (activeFolder === "fatte") {
      await base44.entities.UserRecipe.update(ur.id, { is_prepared: false, status: "per_fare" });
    } else if (activeFolder === "preferite") {
      await base44.entities.UserRecipe.update(ur.id, { is_favorite: false });
    } else {
      const newFolderIds = (ur.folder_ids || []).filter((id) => id !== activeFolder);
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

  const folderRecipes = getRecipesInFolder();
  const filteredSearch = recipes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const activeFolderLabel =
    systemFolders.find((f) => f.key === activeFolder)?.label ||
    customFolders.find((f) => f.id === activeFolder)?.name ||
    "";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <ScreenHeader />
      <div className="px-5 pb-4">
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

      {/* Folder Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-4">
        {systemFolders.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFolder(f.key)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeFolder === f.key
                ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
        {customFolders.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeFolder === f.id
                ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            <span>{f.icon || "📁"}</span>
            {f.name}
          </button>
        ))}
      </div>

      {/* Recipe List */}
      <div className="px-5 space-y-3">
        {folderRecipes.length === 0 ? (
          <div className="text-center py-16">
            <FolderHeart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Nessuna ricetta in questa cartella</p>
            <button
              onClick={() => { setShowAddRecipe(true); setSearchQuery(""); }}
              className="mt-3 text-[#2D6A4F] text-sm font-semibold"
            >
              + Aggiungi ricetta
            </button>
          </div>
        ) : (
          folderRecipes.map(({ recipe }) => (
            <div key={recipe.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-50">
              {recipe.image_url && (
                <img src={recipe.image_url} alt={recipe.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Link to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}>
                  <p className="font-semibold text-gray-900 text-sm truncate">{recipe.title}</p>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{recipe.category}</span>
                  {recipe.prep_time && (
                    <span className="text-xs text-gray-300">· {recipe.prep_time} min</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeRecipeFromFolder(recipe.id)}
                className="p-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Recipe Modal */}
      <Dialog open={showAddRecipe} onOpenChange={setShowAddRecipe}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Aggiungi a "{activeFolderLabel}"</DialogTitle>
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
          <div className="max-h-72 overflow-y-auto space-y-2">
            {filteredSearch.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Nessuna ricetta trovata</p>
            ) : (
              filteredSearch.map((recipe) => {
                const already = isInCurrentFolder(recipe.id);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => { if (!already) addRecipeToFolder(recipe); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      already
                        ? "bg-[#F0F7F4] opacity-60 cursor-default"
                        : "hover:bg-gray-50 cursor-pointer"
                    }`}
                  >
                    {recipe.image_url && (
                      <img src={recipe.image_url} alt={recipe.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{recipe.title}</p>
                      <p className="text-xs text-gray-400">{recipe.category}</p>
                    </div>
                    {already && <span className="text-xs text-[#2D6A4F] font-semibold">✓</span>}
                  </button>
                );
              })
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