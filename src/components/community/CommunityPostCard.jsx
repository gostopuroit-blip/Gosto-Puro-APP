import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, MoreHorizontal, BadgeCheck, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CommunityPostCard({ post, currentUser, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLiked = post.likes?.includes(currentUser?.email);
  const isOwner = post.created_by === currentUser?.email;

  const handleLike = async () => {
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

  const deletePost = async () => {
    if (!confirm("Eliminar questo post?")) return;
    await base44.entities.CommunityPost.delete(post.id);
    onUpdate(null); // null = removed
    toast.success("Post eliminato");
  };

  const avatar = post.user_photo;
  const initials = (post.user_name || post.user_email || "U").charAt(0).toUpperCase();

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {avatar ? (
            <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {post.user_name || post.user_email?.split("@")[0]}
              </p>
              {post.is_expert && (
                <BadgeCheck className="w-4 h-4 text-[#2D6A4F]" />
              )}
            </div>
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </div>
        {isOwner && (
          <button onClick={deletePost} className="text-gray-400 hover:text-red-500 transition p-1">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="w-full aspect-square bg-gray-100 dark:bg-[#111]">
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{post.content}</p>
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
        <button onClick={toggleComments} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition hover:text-[#2D6A4F]">
          <MessageCircle className="w-5 h-5" />
          <span>{post.comments_count || 0}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-100 dark:border-[#2A2A2A] px-4 pb-3">
          {/* Input */}
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
          {/* Comment list */}
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
                      {(c.user_name || c.user_email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="bg-gray-50 dark:bg-[#111] rounded-xl px-3 py-2 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {c.user_name || c.user_email?.split("@")[0]}
                      </p>
                      {c.is_expert && <BadgeCheck className="w-3 h-3 text-[#2D6A4F]" />}
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