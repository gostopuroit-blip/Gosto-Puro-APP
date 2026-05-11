import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const systemFolders = [
  { id: "per_fare", name: "Da fare", icon: "📋" },
  { id: "preferite", name: "Preferite", icon: "❤️" },
];

export default function SaveToFolderModal({ open, onClose, recipeId, onSaved }) {
  const [customFolders, setCustomFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState(["per_fare"]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(true);

  useEffect(() => {
    if (open) loadFolders();
  }, [open]);

  const loadFolders = async () => {
    setLoadingFolders(true);
    const user = await base44.auth.me().catch(() => null);
    const f = user
      ? await base44.entities.Folder.filter({ is_system: false, created_by: user.email })
      : [];
    setCustomFolders(f);
    setLoadingFolders(false);
  };

  const toggleFolder = (id) => {
    setSelectedFolders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createAndAddFolder = async () => {
    if (!newName.trim()) return;
    const f = await base44.entities.Folder.create({ name: newName.trim(), icon: "📁", is_system: false });
    setCustomFolders((prev) => [...prev, f]);
    setSelectedFolders((prev) => [...prev, f.id]);
    setNewName("");
    setShowNew(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) {
      toast.error("Accedi per salvare le ricette");
      setSaving(false);
      return;
    }
    const isPremium = user?.plan === "premium" || user?.role === "admin";
    const existing = await base44.entities.UserRecipe.filter({ recipe_id: recipeId, created_by: user.email });

    // Check free limit only if creating a new UserRecipe record
    if (!isPremium && existing.length === 0) {
      const allUserRecipes = await base44.entities.UserRecipe.filter({ created_by: user.email });
      const totalSaved = allUserRecipes.filter(ur => ur.is_saved).length;
      if (totalSaved >= 4) {
        toast.error("Piano Free: limite de 4 receitas atingido. Seja Premium para salvar mais! ✨");
        setSaving(false);
        return;
      }
    }

    const isFavorite = selectedFolders.includes("preferite");
    const customIds = selectedFolders.filter((id) => id !== "per_fare" && id !== "preferite");

    if (existing.length > 0) {
      await base44.entities.UserRecipe.update(existing[0].id, {
        is_saved: true,
        status: "per_fare",
        is_favorite: isFavorite,
        folder_ids: customIds,
      });
    } else {
      await base44.entities.UserRecipe.create({
        recipe_id: recipeId,
        is_saved: true,
        status: "per_fare",
        is_favorite: isFavorite,
        folder_ids: customIds,
      });
    }
    setSaving(false);
    toast.success("Ricetta salvata! 💚");
    onSaved && onSaved();
    onClose();
  };

  const allFolders = [
    ...systemFolders,
    ...customFolders.map((f) => ({ id: f.id, name: f.name, icon: f.icon || "📁" })),
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Salva nella cartella</DialogTitle>
            <p className="text-xs text-gray-400 mt-0.5">Scegli dove salvare questa ricetta</p>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            {loadingFolders ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[#2D6A4F]" />
              </div>
            ) : (
              allFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => toggleFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all ${
                    selectedFolders.includes(folder.id)
                      ? "border-[#2D6A4F] bg-[#F0F7F4]"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{folder.icon}</span>
                    <span className="text-sm font-semibold text-gray-800">{folder.name}</span>
                  </div>
                  {selectedFolders.includes(folder.id) && (
                    <div className="w-5 h-5 rounded-full bg-[#2D6A4F] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}

            {/* New folder */}
            {showNew ? (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Nome cartella"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="rounded-xl flex-1"
                  onKeyDown={(e) => e.key === "Enter" && createAndAddFolder()}
                  autoFocus
                />
                <Button onClick={createAndAddFolder} size="sm" className="rounded-xl bg-[#2D6A4F] hover:bg-[#235c43]">
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#2D6A4F]/40 hover:text-[#2D6A4F] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Nuova cartella</span>
              </button>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || selectedFolders.length === 0}
            className="w-full mt-5 py-6 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] font-bold shadow-lg shadow-[#2D6A4F]/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva ricetta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}