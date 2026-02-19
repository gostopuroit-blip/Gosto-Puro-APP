import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import RecipeCard from "@/components/RecipeCard";
import { Loader2, Plus, FolderHeart, CheckCircle2, Clock, Star, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const systemFolders = [
  { key: "per_fare", label: "Per fare", icon: "📋", color: "bg-blue-50 text-blue-600" },
  { key: "fatte", label: "Fatte", icon: "✅", color: "bg-green-50 text-green-600" },
  { key: "preferite", label: "Preferite", icon: "❤️", color: "bg-rose-50 text-rose-600" },
  { key: "valutate", label: "Più valutate", icon: "⭐", color: "bg-amber-50 text-amber-600" },
];

export default function Folders() {
  const [activeFolder, setActiveFolder] = useState("per_fare");
  const [userRecipes, setUserRecipes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [customFolders, setCustomFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ur, r, f] = await Promise.all([
      base44.entities.UserRecipe.list("-created_date", 100),
      base44.entities.Recipe.list("-created_date", 100),
      base44.entities.Folder.filter({ is_system: false }),
    ]);
    setUserRecipes(ur);
    setRecipes(r);
    setCustomFolders(f.filter(folder => !folder.is_system));
    setLoading(false);
  };

  const getRecipeById = (id) => recipes.find((r) => r.id === id);

  const getFilteredRecipes = () => {
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
        // Custom folder
        filtered = userRecipes.filter(
          (ur) => ur.folder_ids && ur.folder_ids.includes(activeFolder)
        );
        break;
    }
    
    return filtered.map((ur) => getRecipeById(ur.recipe_id)).filter(Boolean);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await base44.entities.Folder.create({
      name: newFolderName.trim(),
      icon: "📁",
      is_system: false,
    });
    setNewFolderName("");
    setShowNewFolder(false);
    toast.success("Cartella creata!");
    loadData();
  };

  const filteredRecipes = getFilteredRecipes();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Le mie cartelle</h1>
            <p className="text-sm text-gray-400 mt-0.5">Organizza le tue ricette</p>
          </div>
          <Button
            onClick={() => setShowNewFolder(true)}
            size="sm"
            className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuova
          </Button>
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
      <div className="px-5 space-y-4">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-16">
            <FolderHeart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Nessuna ricetta in questa cartella</p>
            <p className="text-gray-300 text-xs mt-1">Salva ricette per trovarle qui</p>
          </div>
        ) : (
          filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))
        )}
      </div>

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