import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, BadgeCheck, Send, Trash2, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function PostDetailModal({ post, currentUser, onClose, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const inputRef = useRef(null);

  const isLiked = localPost.likes?.includes(currentUser?.email);
  const isVerified = localPost.is_expert;
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "admin";
  const isBlurred = localPost.is_premium && !isPremiumUser;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    loadComments();
    return () => { document.body.style.overflow = ""; };
  }, []);

  const loadComments = async () => {
    setLoadingComments(true);
    const data = await base44.entities.CommunityComment.filter({ post_id: post.id }, "-created_date", 50);
    setComments(data);
    setLoadingComments(false);
  };

  const handleLike = async () => {
    if (!currentUser) return toast.error("Fai login per mettere mi piace");
    const likes = localPost.likes || [];
    const newLikes = isLiked
      ? likes.filter((e) => e !== currentUser?.email)
      : [...likes, currentUser?.email];
    const updated = { ...localPost, likes: newLikes, likes_count: newLikes.length };
    await base44.entities.CommunityPost.update(localPost.id, { likes: newLikes, likes_count: newLikes.length });
    setLocalPost(updated);
    onUpdate(updated);
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) return toast.error("Fai login per commentare");
    setSubmitting(true);
    const created = await base44.entities.CommunityComment.create({
      post_id: localPost.id,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
      user_photo: currentUser?.photo_url || null,
      content: newComment.trim(),
      is_expert: currentUser?.role === "expert" || currentUser?.role === "admin",
    });
    const updated = { ...localPost, comments_count: (localPost.comments_count || 0) + 1 };
    await base44.entities.CommunityPost.update(localPost.id, { comments_count: updated.comments_count });
    setLocalPost(updated);
    onUpdate(updated);
    setComments([created, ...comments]);
    setNewComment("");
    setSubmitting(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm("Eliminare questo commento?")) return;
    await base44.entities.CommunityComment.delete(commentId);
    setComments(comments.filter((c) => c.id !== commentId));
    const updated = { ...localPost, comments_count: Math.max(0, (localPost.comments_count || 1) - 1) };
    await base44.entities.CommunityPost.update(localPost.id, { comments_count: updated.comments_count });
    setLocalPost(updated);
    onUpdate(updated);
    toast.success("Commento eliminato");
  };

  const avatar = localPost.user_photo;
  const initials = (localPost.user_name || "U").charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-end justify-center">
      {/* Sheet container */}
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0F0F0F] flex flex-col rounded-t-3xl"
        style={{ height: "92dvh", maxHeight: "92dvh" }}
      >
        {/* Header fixo */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <Link
            to={`/ExpertProfile?id=${localPost.created_by}`}
            onClick={onClose}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {localPost.user_name || "Utente"}
                </p>
                {isVerified && <BadgeCheck className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(localPost.created_date), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          {/* Imagem */}
          {localPost.image_url && (
            <div className={`w-full bg-black relative ${isBlurred ? "overflow-hidden" : ""}`}>
              <img
                src={localPost.image_url}
                alt=""
                className={`w-full object-contain max-h-[50vh] ${isBlurred ? "blur-xl scale-110" : ""}`}
              />
              {isBlurred && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Lock className="w-8 h-8 text-white" />
                  <p className="text-white font-bold text-sm">Contenuto Premium</p>
                  <p className="text-white/80 text-xs">Abbonati per vedere</p>
                </div>
              )}
            </div>
          )}

          {/* Curtidas e comentários */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A]">
            <button onClick={handleLike} className="flex items-center gap-1.5 text-sm font-medium transition">
              <Heart className={`w-6 h-6 transition ${isLiked ? "fill-red-500 text-red-500" : "text-gray-700 dark:text-gray-300"}`} />
              <span className={isLiked ? "text-red-500" : "text-gray-600 dark:text-gray-400"}>
                {localPost.likes_count || 0}
              </span>
            </button>
            <button
              onClick={() => inputRef.current?.focus()}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              <MessageCircle className="w-6 h-6" />
              <span>{localPost.comments_count || 0}</span>
            </button>
          </div>

          {/* Texto / legenda */}
          {(localPost.title || localPost.content) && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A]">
              {localPost.title && (
                <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{localPost.title}</p>
              )}
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{localPost.content}</p>
              {localPost.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {localPost.tags.map((tag) => (
                    <span key={tag} className="text-xs text-[#2D6A4F] font-medium">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de comentários */}
          <div className="px-4 pt-3 pb-4 space-y-4">
            {loadingComments ? (
              <p className="text-xs text-gray-400 text-center py-4">Caricamento...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nessun commento ancora</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  {c.user_photo ? (
                    <img src={c.user_photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(c.user_name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {c.user_name || "Utente"}
                      </p>
                      {c.is_expert && <BadgeCheck className="w-3 h-3 text-[#2D6A4F]" />}
                      {(currentUser?.role === "admin" || c.created_by === currentUser?.email) && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="ml-auto text-gray-300 hover:text-red-500 transition p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Campo de novo comentário — fixo na parte inferior */}
        {currentUser && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-[#2A2A2A] flex-shrink-0 bg-white dark:bg-[#0F0F0F]">
            {currentUser.photo_url ? (
              <img src={currentUser.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(currentUser.full_name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Aggiungi un commento..."
              className="flex-1 text-sm bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-2xl px-3 py-2 text-gray-800 dark:text-white outline-none"
            />
            <button
              onClick={submitComment}
              disabled={submitting || !newComment.trim()}
              className="text-[#2D6A4F] disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}