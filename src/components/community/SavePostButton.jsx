import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bookmark, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SavePostButton({ post, currentUser, onSaveChange }) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!currentUser || !post) return;
    base44.entities.SavedPost.filter(
      { post_id: post.id, user_email: currentUser.email },
      "-created_date",
      1
    ).then((saved) => setIsSaved(saved.length > 0)).catch(() => {});
  }, [currentUser?.email, post?.id]);

  const handleSaveClick = async () => {
    if (!currentUser) {
      toast.error("Fai login per salvare i post");
      return;
    }

    if (isSaved) {
      // Unsave directly
      setIsLoading(true);
      try {
        const saved = await base44.entities.SavedPost.filter({
          post_id: post.id,
          user_email: currentUser.email,
        });
        if (saved.length > 0) {
          await base44.entities.SavedPost.delete(saved[0].id);
        }
        setIsSaved(false);
        onSaveChange?.(false);
        toast.success("Post rimosso dai salvati");
      } catch {
        toast.error("Errore nella rimozione");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Show collection modal before saving
      setShowModal(true);
    }
  };

  const handleSaved = (collectionName) => {
    setIsSaved(true);
    setShowModal(false);
    onSaveChange?.(true);
    toast.success(`Post salvato in "${collectionName}" 🔖`, {
      action: {
        label: "Profilo",
        onClick: () => window.location.href = `/ExpertProfile?uid=${btoa(currentUser.email)}`,
      },
      duration: 4000,
    });
  };

  return (
    <>
      <motion.button
        onClick={handleSaveClick}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition hover:text-[#2D6A4F] disabled:opacity-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={isSaved ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {isSaved ? (
            <Bookmark className="w-5 h-5 fill-[#2D6A4F] text-[#2D6A4F]" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </motion.div>
      </motion.button>

      {showModal && (
        <SaveToCollectionModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

function SaveToCollectionModal({ post, currentUser, onClose, onSaved }) {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("Salvati");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.SavedPost.filter({ user_email: currentUser.email }, "-created_date", 500)
      .then((saved) => {
        const unique = [...new Set(saved.map((s) => s.collection || "Salvati"))];
        setCollections(unique.length > 0 ? unique : ["Salvati"]);
      })
      .catch(() => setCollections(["Salvati"]));
  }, []);

  const handleSave = async () => {
    const collectionName = isCreatingNew ? newCollectionName.trim() : selectedCollection;
    if (!collectionName) {
      toast.error("Seleziona o crea una collezione");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.SavedPost.create({
        post_id: post.id,
        user_email: currentUser.email,
        collection: collectionName,
      });
      onSaved(collectionName);
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full max-w-lg p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🔖 Salva in collezione
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isCreatingNew ? (
          <>
            <div className="space-y-2 mb-4">
              {collections.map((col) => (
                <button
                  key={col}
                  onClick={() => setSelectedCollection(col)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    selectedCollection === col
                      ? "border-[#2D6A4F] bg-[#2D6A4F]/10 text-[#2D6A4F]"
                      : "border-gray-100 dark:border-[#2A2A2A] text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111]"
                  }`}
                >
                  📁 {col}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full text-center px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#333] text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-[#2D6A4F] transition mb-4"
            >
              ➕ Nuova collezione
            </button>
          </>
        ) : (
          <div className="mb-4">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Es: Ricette preferite, Ispirazioni..."
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white outline-none mb-3"
              autoFocus
            />
            <button
              onClick={() => setIsCreatingNew(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← Torna alle collezioni
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (isCreatingNew && !newCollectionName.trim())}
            className="flex-1 py-3 rounded-xl bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}