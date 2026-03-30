import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Repeat2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RepostModal({ post, currentUser, onClose, onReposted }) {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRepost = async () => {
    setLoading(true);
    try {
      await base44.entities.PostShare.create({
        sharer_email: currentUser.email,
        original_post_id: post.id,
        share_type: "repost",
        caption: caption.trim() || undefined,
      });

      // Create notification if reposting someone else's post
      if (post.created_by !== currentUser.email) {
        await base44.functions
          .invoke("createRepostNotification", {
            post_id: post.id,
            post_author_email: post.created_by,
            reposter_email: currentUser.email,
            reposter_name: currentUser.full_name || currentUser.email?.split("@")[0],
            reposter_photo: currentUser.photo_url || null,
          })
          .catch(() => {});
      }

      toast.success("Post repostato! 🔁");
      onReposted?.();
      onClose();
    } catch (error) {
      toast.error("Errore nel repost");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full max-w-lg p-5 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Repeat2 className="w-5 h-5 text-[#2D6A4F]" /> Repostare
        </h3>

        {/* Original post preview */}
        <div className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">POST ORIGINALE</p>
          <div className="flex gap-2 items-start">
            {post.user_photo ? (
              <img src={post.user_photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(post.user_name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{post.user_name || "Utente"}</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-3">{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="" className="w-full mt-2 rounded-lg object-cover max-h-40" />
              )}
            </div>
          </div>
        </div>

        {/* Caption input */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 300))}
          placeholder="Aggiungi un commento (opzionale)..."
          className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white outline-none resize-none h-24 mb-4"
        />
        <p className="text-xs text-gray-400 text-right mb-4">{caption.length}/300</p>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#111] transition disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleRepost}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-sm font-semibold hover:bg-[#235c43] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Repostando...
              </>
            ) : (
              <>
                <Repeat2 className="w-4 h-4" /> Repostare
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}