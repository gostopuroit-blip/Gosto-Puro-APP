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
  const inputRef = useRef(null);

  const isLiked = post.likes?.includes(currentUser?.email);
  const isOwner = post.created_by === currentUser?.email;
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "admin";
  const isBlurred = post.is_premium && !isPremiumUser;
  const isVerified = post.is_expert;

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
    const likes = post.likes || [];
    const newLikes = isLiked
      ? likes.filter((e) => e !== currentUser?.email)
      : [...likes, currentUser?.email];
    await base44.entities.CommunityPost.update(post.id, { likes: newLikes, likes_count: newLikes.length });
    onUpdate({ ...post, likes: newLikes, likes_count: newLikes.length });
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) return toast.error("Fai login per commentare");
    setSubmitting(true);
    const created = await base44.entities.CommunityComment.create({
      post_id: post.id,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
      user_photo: currentUser?.photo_url || null,
      content: newComment.trim(),
      is_expert: currentUser?.role === "expert" || currentUser?.role === "admin",
    });
    await base44.entities.CommunityPost.update(post.id, { comments_count: (post.comments_count || 0) + 1 });
    onUpdate({ ...post, comments_count: (post.comments_count || 0) + 1 });
    setComments([created, ...comments]);
    setNewComment("");
    setSubmitting(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm("Eliminare questo commento?")) return;
    await base44.entities.CommunityComment.delete(commentId);
    setComments(comments.filter((c) => c.id !== commentId));
    await base44.entities.CommunityPost.update(post.id, { comments_count: Math.max(0, (post.comments_count || 1) - 1) });
    onUpdate({ ...post, comments_count: Math.max(0, (post.comments_count || 1) - 1) });
    toast.success("Commento eliminato");
  };

  const avatar = post.user_photo;
  const initials = (post.user_name || "U").charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-60 text-white bg-black/40 rounded-full p-2"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex flex-col max-w-lg mx-auto w-full bg-white dark:bg-[#0F0F0F] overflow-hidden" style={{ height: "calc(100% - 64px)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <Link to={`/ExpertProfile?id=${post.created_by}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
            {avatar ? (
              <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{post.user_name || "Utente"}</p>
                {isVerified && <BadgeCheck className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </Link>
        </div>

        {/* Image — full width, no crop */}
        {post.image_url && (
          <div className={`w-full bg-black relative flex-shrink-0 ${isBlurred ? "overflow-hidden" : ""}`}>
            <img
              src={post.image_url}
              alt=""
              className={`w-full object-contain max-h-[55vh] ${isBlurred ? "blur-xl scale-110" : ""}`}
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

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <button onClick={handleLike} className="flex items-center gap-1.5 text-sm font-medium transition">
            <Heart className={`w-6 h-6 transition ${isLiked ? "fill-red-500 text-red-500" : "text-gray-700 dark:text-gray-300"}`} />
            <span className={isLiked ? "text-red-500" : "text-gray-600 dark:text-gray-400"}>{post.likes_count || 0}</span>
          </button>
          <button
            onClick={() => inputRef.current?.focus()}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400"
          >
            <MessageCircle className="w-6 h-6" />
            <span>{post.comments_count || 0}</span>
          </button>
        </div>

        {/* Caption */}
        {(post.title || post.content) && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
            {post.title && <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{post.title}</p>}
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{post.content}</p>
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs text-[#2D6A4F] font-medium">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments list — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{c.user_name || "Utente"}</p>
                    {c.is_expert && <BadgeCheck className="w-3 h-3 text-[#2D6A4F]" />}
                    {(currentUser?.role === "admin" || c.created_by === currentUser?.email) && (
                      <button onClick={() => deleteComment(c.id)} className="ml-auto text-gray-300 hover:text-red-500 transition p-0.5">
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

        {/* Comment input — fixed at bottom */}
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
              className="text-[#2D6A4F] disabled:opacity-40 font-semibold text-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}