import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BadgeCheck, Send, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function RecipeComments({ recipeId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [recipeId]);

  const loadComments = async () => {
    setLoading(true);
    const data = await base44.entities.RecipeComment.filter(
      { recipe_id: recipeId, status: "active" },
      "-created_date",
      50
    );
    setComments(data);
    setLoading(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm("Eliminare questo commento?")) return;
    await base44.entities.RecipeComment.delete(commentId);
    setComments(comments.filter((c) => c.id !== commentId));
    toast.success("Commento eliminato");
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) return toast.error("Devi essere loggato per commentare");
    setSubmitting(true);
    const created = await base44.entities.RecipeComment.create({
      recipe_id: recipeId,
      user_email: currentUser.email,
      user_name: currentUser.display_name || currentUser.full_name || currentUser.email.split("@")[0],
      user_photo: currentUser.photo_url || null,
      content: newComment.trim(),
      is_expert: currentUser.role === "expert" || currentUser.role === "admin",
      status: "active",
    });
    setComments([created, ...comments]);
    setNewComment("");
    setSubmitting(false);
    toast.success("Commento aggiunto!");
  };

  return (
    <div className="mt-6">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
        Commenti ({comments.length})
      </h3>

      {/* Input */}
      {currentUser && (
        <div className="flex items-center gap-2 mb-5">
          {currentUser.photo_url ? (
            <img src={currentUser.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(currentUser.display_name || currentUser.full_name || currentUser.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#1A2B20] border border-gray-200 dark:border-[#3D5246] rounded-2xl px-3 py-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Aggiungi un commento..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400"
            />
            <button
              onClick={submitComment}
              disabled={submitting || !newComment.trim()}
              className="text-[#2D6A4F] disabled:opacity-40 flex-shrink-0"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Nessun commento ancora. Sii il primo!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.user_photo ? (
                <img src={c.user_photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(c.user_name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {c.user_name || c.user_email?.split("@")[0]}
                  </span>
                  {c.is_expert && (
                    <BadgeCheck className="w-4 h-4 text-[#2D6A4F]" />
                  )}
                  <span className="text-xs text-gray-400 ml-1">
                    {formatDistanceToNow(new Date(c.created_date), { addSuffix: true, locale: ptBR })}
                  </span>
                  {(currentUser?.role === "admin" || c.created_by === currentUser?.email) && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="ml-auto text-gray-300 hover:text-red-500 transition p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}