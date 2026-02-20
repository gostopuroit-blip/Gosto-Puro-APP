import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, FolderHeart, Search, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RecipeCard from "@/components/RecipeCard";

const systemFolders = [
  { key: "per_fare", label: "Per fare", icon: "📋" },
  { key: "fatte", label: "Fatte", icon: "✅" },
  { key: "preferite", label: "Preferite", icon: "❤️" },
  { key: "valutate", label: "Più valutate", icon: "⭐" },
];

const iconOptions = ["📁", "📂", "❤️", "⭐", "📋", "🍴", "📸", "🎯", "🔥", "💚", "🎨", "📚", "🛒", "⚡", "🌟"];

export default function Folders() {
  const [expandedFolder, setExpandedFolder] = useState(null); // Track expanded folder
  const [userRecipes, setUserRecipes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [customFolders, setCustomFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

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

   const updateFolderIcon = async (folderId, newIcon) => {
     await base44.entities.Folder.update(folderId, { icon: newIcon });
     setEditingFolderId(null);
     setShowIconPicker(false);
     toast.success("Icona aggiornata!");
     loadData();
   };

   const deleteFolder = async (folderId) => {
     if (!confirm("Sei sicuro di voler eliminare questa cartella?")) return;
     await base44.entities.Folder.delete(folderId);
     toast.success("Cartella eliminata!");
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
      <div className="px-5 pt-14 pb-6 bg-gradient-to-b from-[#F0F7F4] dark:from-[#1A2B20] to-[#FAFAF8] dark:to-[#0F1A14]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Le mie cartelle</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Organizza le tue ricette</p>
          </div>
          <Button
            onClick={() => setShowNewFolder(true)}
            size="sm"
            className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-semibold"
          >
            <FolderHeart className="w-4 h-4 mr-2" />
            Nuova
          </Button>
        </div>
      </div>

      {/* Folder Grid */}
      <div className="px-5 space-y-3">
        {systemFolders.map((f) => {
          const folderRecipes = getRecipesInFolder(f.key);
          const isExpanded = expandedFolder === f.key;
          return (
            <div key={f.key} className="bg-white dark:bg-[#2D3F35] border border-gray-100 dark:border-[#3D5246] rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedFolder(isExpanded ? null : f.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#1A2B20] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{f.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{folderRecipes.length} ricette</p>
                  </div>
                </div>
                <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-[#3D5246] grid grid-cols-2 gap-3">
                  {folderRecipes.map(({ ur, recipe }) => (
                    <div key={recipe.id} className="rounded-xl overflow-hidden border border-gray-100 dark:border-[#3D5246] bg-white dark:bg-[#1A2B20]">
                      <Link
                        to={`/recipe/${recipe.id}`}
                        className="aspect-square w-full bg-gray-200 dark:bg-[#0F1A14] overflow-hidden relative group"
                      >
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </Link>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{recipe.title}</p>
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => removeRecipeFromFolder(recipe.id, f.key)}
                            className="flex-1 text-xs py-1 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 font-semibold transition"
                          >
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Custom Folders */}
        {customFolders.map((folder) => {
          const folderRecipes = getRecipesInFolder(folder.id);
          const isExpanded = expandedFolder === folder.id;
          return (
            <div key={folder.id} className="bg-white dark:bg-[#2D3F35] border border-gray-100 dark:border-[#3D5246] rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedFolder(isExpanded ? null : folder.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#1A2B20] transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folder.id);
                      setShowIconPicker(true);
                    }}
                  >
                    {folder.icon}
                  </span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{folder.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{folderRecipes.length} ricette</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder.id);
                    }}
                    className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-[#3D5246] grid grid-cols-2 gap-3">
                  {folderRecipes.map(({ ur, recipe }) => (
                    <div key={recipe.id} className="rounded-xl overflow-hidden border border-gray-100 dark:border-[#3D5246] bg-white dark:bg-[#1A2B20]">
                      <Link
                        to={`/recipe/${recipe.id}`}
                        className="aspect-square w-full bg-gray-200 dark:bg-[#0F1A14] overflow-hidden relative group"
                      >
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </Link>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{recipe.title}</p>
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => removeRecipeFromFolder(recipe.id, folder.id)}
                            className="flex-1 text-xs py-1 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 font-semibold transition"
                          >
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Recipe Dialog */}
      <Dialog open={showAddRecipe} onOpenChange={setShowAddRecipe}>
        <DialogContent className="dark:bg-[#2D3F35] dark:border-[#3D5246]">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Aggiungi ricetta a cartella</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-600" />
              <Input
                placeholder="Cerca ricetta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 dark:bg-[#1A2B20] dark:border-[#3D5246] dark:text-white"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredSearch.map((recipe) => (
                <div key={recipe.id} className="p-3 border border-gray-200 dark:border-[#3D5246] rounded-lg flex items-start gap-3 bg-gray-50 dark:bg-[#1A2B20]">
                  <img src={recipe.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{recipe.title}</p>
                    <div className="flex gap-2 mt-2">
                      {systemFolders.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => { addRecipeToFolder(recipe, f.key); setShowAddRecipe(false); }}
                          className="text-xs px-2 py-1 rounded bg-white dark:bg-[#2D3F35] border border-gray-200 dark:border-[#3D5246] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3D5246] transition"
                        >
                          {f.label}
                        </button>
                      ))}
                      {customFolders.map((cf) => (
                        <button
                          key={cf.id}
                          onClick={() => { addRecipeToFolder(recipe, cf.id); setShowAddRecipe(false); }}
                          className="text-xs px-2 py-1 rounded bg-white dark:bg-[#2D3F35] border border-gray-200 dark:border-[#3D5246] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3D5246] transition"
                        >
                          {cf.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="dark:bg-[#2D3F35] dark:border-[#3D5246]">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Crea nuova cartella</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome cartella..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="dark:bg-[#1A2B20] dark:border-[#3D5246] dark:text-white"
          />
          <Button
            onClick={createFolder}
            className="w-full bg-[#2D6A4F] hover:bg-[#235c43] rounded-lg"
          >
            Crea
          </Button>
        </DialogContent>
      </Dialog>

      {/* Icon Picker Dialog */}
      <Dialog open={showIconPicker} onOpenChange={setShowIconPicker}>
        <DialogContent className="dark:bg-[#2D3F35] dark:border-[#3D5246]">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Scegli icona</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-2">
            {iconOptions.map((icon) => (
              <button
                key={icon}
                onClick={() => updateFolderIcon(editingFolderId, icon)}
                className="text-3xl p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1A2B20] transition"
              >
                {icon}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}