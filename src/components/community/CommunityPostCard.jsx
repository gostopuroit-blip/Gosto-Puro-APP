import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, BadgeCheck, Send, Trash2, Lock, Lightbulb, UtensilsCrossed, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const POST_TYPE_META = {
  tip: { label: "Dica", icon: Lightbulb, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  recipe: { label: "Ricetta", icon: UtensilsCrossed, color: "bg-green-100 text-[#2D6A4F] dark:bg-green-950/40 dark:text-green-400" },
  premium_content: { label: "Premium", icon: Lock, color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
  image_post: null,
};

export default function CommunityPostCard({ post, currentUser, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const shareRef = useRef(null);

  const isLiked = post.likes?.includes(currentUser?.email);
  const isOwner = post.created_by === currentUser?.email;
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "admin";
  const isBlurred = post.is_premium && !isPremiumUser;
  const isVerified = post.is_expert; // só admin/expert têm is_expert=true

  // Fechar share ao clicar fora
  useEffect(() => {
    if (!showShare) return;
    const handler = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShowShare(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showShare]);

  const handleLike = async () => {
    if (!currentUser) return toast.error("Fai login per mettere mi piace");
    const likes = post.likes || [];
    const newLikes = isLiked
      ? likes.filter((e) => e !== currentUser?.email)
      : [...likes, currentUser?.email];
    await base44.entities.CommunityPost.update(post.id, {
      likes: newLikes,
      likes_count: newLikes.length,
    });
    onUpdate({ ...post, likes: newLikes, likes_count: newLikes.length });
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const data = await base44.entities.CommunityComment.filter({ post_id: post.id }, "-created_date", 50);
    setComments(data);
    setLoadingComments(false);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
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
    await base44.entities.CommunityPost.update(post.id, {
      comments_count: (post.comments_count || 0) + 1,
    });
    onUpdate({ ...post, comments_count: (post.comments_count || 0) + 1 });
    setComments([created, ...comments]);
    setNewComment("");
    setSubmitting(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm("Eliminare questo commento?")) return;
    await base44.entities.CommunityComment.delete(commentId);
    setComments(comments.filter((c) => c.id !== commentId));
    await base44.entities.CommunityPost.update(post.id, {
      comments_count: Math.max(0, (post.comments_count || 1) - 1),
    });
    onUpdate({ ...post, comments_count: Math.max(0, (post.comments_count || 1) - 1) });
    toast.success("Commento eliminato");
  };

  const deletePost = async () => {
    if (!confirm("Eliminar questo post?")) return;
    await base44.entities.CommunityPost.delete(post.id);
    onUpdate(null);
    toast.success("Post eliminato");
  };

  const handleShare = (fn) => {
    setShowShare(false);
    fn();
  };

  const avatar = post.user_photo;
  const initials = (post.user_name || "U").charAt(0).toUpperCase();
  const typeMeta = POST_TYPE_META[post.post_type] || null;

  // Label do plano do autor do post (baseado nos dados do post)
  const authorPlanLabel = post.is_expert
    ? null // expert/admin: mostra badge verificado em vez disso
    : null; // usuário comum: nada extra

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          to={`/ExpertProfile?id=${post.created_by}`}
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
                {post.user_name || "Utente"}
              </p>
              {/* Badge verificado apenas para expert/admin */}
              {isVerified && <BadgeCheck className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />}
            </div>
            {/* Data + plano do autor */}
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          {typeMeta && (
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeMeta.color}`}>
              <typeMeta.icon className="w-3 h-3" />
              {typeMeta.label}
            </span>
          )}
          {post.is_premium && post.post_type !== "premium_content" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
              <Lock className="w-3 h-3" />
              Premium
            </span>
          )}
          {(isOwner || currentUser?.role === "admin") && (
            <button onClick={deletePost} className="text-gray-300 hover:text-red-500 transition p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image */}
      {post.image_url && (
        <div className={`w-full bg-gray-100 dark:bg-[#111] relative ${isBlurred ? "overflow-hidden" : ""}`}>
          <img
            src={post.image_url}
            alt=""
            className={`w-full object-cover max-h-80 ${isBlurred ? "blur-xl scale-110" : ""}`}
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

      {/* Content */}
      <div className={`px-4 pt-3 pb-1 relative ${isBlurred && !post.image_url ? "overflow-hidden" : ""}`}>
        {post.title && (
          <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{post.title}</p>
        )}
        <div className={isBlurred ? "blur-sm select-none" : ""}>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-4">{post.content}</p>
        </div>
        {isBlurred && (
          <div className="mt-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">🔒 Contenuto esclusivo Premium</p>
            <p className="text-xs text-purple-500 mt-0.5">Passa a Premium per accedere a tutti i contenuti</p>
          </div>
        )}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs text-[#2D6A4F] font-medium">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button onClick={handleLike} className="flex items-center gap-1.5 text-sm font-medium transition">
          <Heart className={`w-5 h-5 transition ${isLiked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          <span className={isLiked ? "text-red-500" : "text-gray-500 dark:text-gray-400"}>
            {post.likes_count || 0}
          </span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition hover:text-[#2D6A4F]">
          <MessageCircle className="w-5 h-5" />
          <span>{post.comments_count || 0}</span>
        </button>

        {/* Share button — state-controlled, não hover */}
        <div className="ml-auto relative" ref={shareRef}>
          <button
            onClick={() => setShowShare((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-[#2D6A4F] transition p-1"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {showShare && (
            <div className="absolute bottom-10 right-0 flex flex-col gap-1 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl shadow-xl p-2 z-50 w-44">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111] transition text-left w-full"
                onClick={() => handleShare(() => {
                  navigator.clipboard.writeText(post.image_url || window.location.href);
                  toast.success("Link copiato! Incollalo su Instagram");
                })}
              >📸 Instagram</button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111] transition text-left w-full"
                onClick={() => handleShare(() => {
                  navigator.clipboard.writeText(post.image_url || window.location.href);
                  toast.success("Link copiato! Incollalo su TikTok");
                })}
              >🎵 TikTok</button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111] transition text-left w-full"
                onClick={() => handleShare(() => {
                  const url = encodeURIComponent(window.location.href);
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
                })}
              >📘 Facebook</button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111] transition text-left w-full"
                onClick={() => handleShare(() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copiato!");
                })}
              >🔗 Copia link</button>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-100 dark:border-[#2A2A2A] px-4 pb-3">
          {currentUser && (
            <div className="flex items-center gap-2 py-3">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="Aggiungi un commento..."
                className="flex-1 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-gray-800 dark:text-white outline-none"
              />
              <button
                onClick={submitComment}
                disabled={submitting || !newComment.trim()}
                className="text-[#2D6A4F] disabled:opacity-40 p-1"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
          {loadingComments ? (
            <p className="text-xs text-gray-400 text-center py-2">Caricamento...</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  {c.user_photo ? (
                    <img src={c.user_photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(c.user_name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="bg-gray-50 dark:bg-[#111] rounded-xl px-3 py-2 flex-1">
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}