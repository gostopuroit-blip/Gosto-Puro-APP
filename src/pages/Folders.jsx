import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PremiumGate from "@/components/PremiumGate";
import { Loader2, Plus, FolderHeart, Search, X, Trash2, ChefHat, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RecipeCard from "@/components/RecipeCard";

const systemFolders = [
  { key: "per_fare", label: "Da fare", icon: "📋" },
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
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { loadData(); }, []);

  const fetchAllPages = async (fetchFn) => {
    const PAGE = 200;
    let all = [];
    let skip = 0;
    while (true) {
      const batch = await fetchFn(PAGE, skip);
      all = all.concat(batch);
      if (batch.length < PAGE) break;
      skip += PAGE;
    }
    return all;
  };

  const loadData = async () => {
    const user = await base44.auth.me().catch(() => null);
    setCurrentUser(user);

    const [ur, f] = await Promise.all([
      user
        ? fetchAllPages((limit, skip) =>
            base44.entities.UserRecipe.filter({ user_id: user.id }, "-created_at", limit, skip)
          )
        : Promise.resolve([]),
      user
        ? base44.entities.Folder.filter({ is_system: false, user_id: user.id })
        : Promise.resolve([]),
    ]);

    // Busca SÓ as receitas referenciadas em user_recipes (não todas as 3000)
    const recipeIds = [...new Set(ur.map(x => x.recipe_id).filter(Boolean))];
    let r = [];
    if (recipeIds.length > 0) {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase
        .from("recipes")
        .select("id,title,image_url,prep_time,calories,paese,category,description,media_rating,rating_count,numero_salvate,numero_preparate")
        .in("id", recipeIds);
      r = data || [];
    }

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

  const getTotalSavedRecipes = () => {
    return userRecipes.filter((ur) => ur.is_saved).length;
  };

  const addRecipeToFolder = async (recipe, folderId) => {
    const existing = userRecipes.find((u) => u.recipe_id === recipe.id);
    const isFree = !currentUser?.is_premium;

    // Check if trying to add to custom folder as free user
    const isCustomFolder = !["per_fare", "fatte", "preferite", "valutate"].includes(folderId);
    if (isFree && isCustomFolder) {
      toast.error("Solo gli utenti premium possono usare cartelle personalizzate");
      return;
    }

    // Only limit free users adding NEW recipes to system folders
    if (isFree && !existing?.is_saved) {
      const totalSaved = getTotalSavedRecipes();
      if (totalSaved >= 4) {
        toast.error("Limite di 4 ricette raggiunto per gli utenti gratuiti");
        return;
      }
    }

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
    const isFree = !currentUser?.is_premium;
    if (isFree) {
      toast.error("Solo gli utenti premium possono creare cartelle personalizzate");
      return;
    }
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


  const isPremium = currentUser?.is_premium;

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Le mie cartelle</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Organizza le tue ricette</p>
          </div>
          {(currentUser?.is_premium) && (
            <Button
              onClick={() => setShowNewFolder(true)}
              size="sm"
              className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-semibold"
            >
              <FolderHeart className="w-4 h-4 mr-2" />
              Nuova
            </Button>
          )}
        </div>
      </div>

      {/* Cosa cucino adesso — Premium only */}
      <div className="px-5 mb-4">
        {isPremium ? (
          <Link to="/WhatToCook" className="flex items-center gap-3 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] rounded-2xl px-4 py-3.5 shadow-md">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Cosa cucino adesso?</p>
              <p className="text-white/70 text-xs">Filtra per tempo e ingredienti disponibili</p>
            </div>
            <span className="text-white/60 text-lg">→</span>
          </Link>
        ) : (
          <a href="https://pay.hotmart.com/L104095305F?off=sk18i3wx&checkoutMode=10" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 rounded-2xl px-4 py-3.5 shadow-md relative overflow-hidden">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-5 h-5 text-white/60" />
            </div>
            <div className="flex-1">
              <p className="text-white/70 font-bold text-sm">Cosa cucino adesso?</p>
              <p className="text-white/50 text-xs">Filtra per tempo e ingredienti disponibili</p>
            </div>
            <div className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[11px] font-bold px-2 py-1 rounded-lg">
              <Crown className="w-3 h-3" /> Premium
            </div>
          </a>
        )}
      </div>

      {/* Custom Folders - Premium Gate */}
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
               <div className="px-4 pb-4 border-t border-gray-100 dark:border-[#3D5246] space-y-3">
                 {(currentUser?.is_premium) && (
                   <Button
                     onClick={() => setShowAddRecipe(true)}
                     size="sm"
                     className="w-full rounded-lg bg-[#2D6A4F] hover:bg-[#235c43] text-white text-xs font-semibold"
                   >
                     <Plus className="w-4 h-4 mr-1" />
                     Aggiungi ricetta
                   </Button>
                 )}
                 {folderRecipes.map(({ ur, recipe }) => (
                   <div key={recipe.id} className="relative group">
                     <RecipeCard recipe={recipe} />
                     <button
                       onClick={() => removeRecipeFromFolder(recipe.id, f.key)}
                       className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors z-10"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 ))}
               </div>
             )}
           </div>
         );
       })}

       {/* Custom Folders - Premium Only */}
       <PremiumGate user={currentUser} feature="le cartelle personalizzate">
         <div className="relative min-h-[200px] space-y-3">
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
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-[#3D5246] space-y-3">
                  {(currentUser?.is_premium) && (
                    <Button
                      onClick={() => setShowAddRecipe(true)}
                      size="sm"
                      className="w-full rounded-lg bg-[#2D6A4F] hover:bg-[#235c43] text-white text-xs font-semibold"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Aggiungi ricetta
                    </Button>
                  )}
                  {folderRecipes.map(({ ur, recipe }) => (
                    <div key={recipe.id} className="relative group">
                      <RecipeCard recipe={recipe} />
                      <button
                        onClick={() => removeRecipeFromFolder(recipe.id, folder.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
          })}
          </div>
          </PremiumGate>
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
                    <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar pb-1">
                      {systemFolders.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => { addRecipeToFolder(recipe, f.key); setShowAddRecipe(false); }}
                          className="flex-shrink-0 text-xs px-2 py-1 rounded bg-white dark:bg-[#2D3F35] border border-gray-200 dark:border-[#3D5246] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3D5246] transition"
                        >
                          {f.label}
                        </button>
                      ))}
                      {customFolders.map((cf) => (
                        <button
                          key={cf.id}
                          onClick={() => { addRecipeToFolder(recipe, cf.id); setShowAddRecipe(false); }}
                          className="flex-shrink-0 text-xs px-2 py-1 rounded bg-white dark:bg-[#2D3F35] border border-gray-200 dark:border-[#3D5246] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3D5246] transition"
                        >
                          {cf.icon} {cf.name}
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