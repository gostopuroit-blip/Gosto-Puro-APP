import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Folder } from "lucide-react";
import { toast } from "sonner";

export default function SavePostModal({ post, currentUser, onClose, onSaved }) {
  const [collections, setCollections] = useState(["Salvati"]);
  const [newCollection, setNewCollection] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("Salvati");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCollections = async () => {
      if (!currentUser) return;
      try {
        const saved = await base44.entities.SavedPost.filter(
          { user_email: currentUser.email },
          "-created_date",
          100
        ).catch(() => []);
        const unique = ["Salvati", ...new Set(saved.map((s) => s.collection).filter((c) => c && c !== "Salvati"))];
        setCollections(unique);
      } catch (error) {
        console.error("Load collections error:", error);
      }
      setLoading(false);
    };
    loadCollections();
  }, [currentUser]);

  const handleSaveToCollection = async () => {
    if (!currentUser) return toast.error("Fai login");
    
    let target = selectedCollection;
    if (newCollection.trim()) {
      target = newCollection.trim();
    }

    if (!target) return toast.error("Seleziona o crea una cartella");

    try {
      await base44.entities.SavedPost.create({
        post_id: post.id,
        user_email: currentUser.email,
        collection: target,
      });
      toast.success(`Post salvato in "${target}"`);
      onSaved();
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Errore nel salvare");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 pb-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-[#2D6A4F]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Salva in cartella
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Caricamento...</p>
        ) : (
          <>
            {/* Existing collections */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {collections.map((col) => (
                <button
                  key={col}
                  onClick={() => {
                    setSelectedCollection(col);
                    setNewCollection("");
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border transition ${
                    selectedCollection === col && !newCollection
                      ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                      : "bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-900 dark:text-white hover:border-[#2D6A4F]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    <span className="text-sm font-semibold">{col}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* New collection input */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                O crea una nuova cartella
              </label>
              <input
                type="text"
                value={newCollection}
                onChange={(e) => {
                  setNewCollection(e.target.value);
                  if (e.target.value.trim()) setSelectedCollection("");
                }}
                placeholder="Nome della cartella..."
                className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white outline-none"
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveToCollection}
              className="w-full flex items-center justify-center gap-2 bg-[#2D6A4F] text-white font-bold py-3 rounded-2xl hover:bg-[#235c43] transition"
            >
              <Plus className="w-4 h-4" />
              Salva post
            </button>

            <button
              onClick={onClose}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2 transition"
            >
              Annulla
            </button>
          </>
        )}
      </div>
    </div>
  );
}