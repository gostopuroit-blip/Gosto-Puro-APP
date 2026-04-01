import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, BadgeCheck, Send, Trash2, Lock, Lightbulb, UtensilsCrossed, Hash, Pin, Repeat2, BarChart2, HelpCircle } from "lucide-react";
import UserAvatar from "../UserAvatar";
import { getDisplayName, getPhotoUrl } from "@/lib/userDisplayUtils";
import PollCard from "./PollCard";
import QuizCard from "./QuizCard";
import ReactionButton from "./ReactionButton";
import ImageCarousel from "./ImageCarousel";
import ImageLightbox from "./ImageLightbox";
import VideoPlayer from "./VideoPlayer";
import VideoLightbox from "./VideoLightbox";
import SavePostButton from "./SavePostButton";
import MentionText from "./MentionText";
import LinkPreviewCard from "./LinkPreviewCard";
import LinkTextWithUrls from "./LinkTextWithUrls";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/communityUtils";
import { Link, useNavigate } from "react-router-dom";
import PostDetailModal from "./PostDetailModal";
import FollowButton from "./FollowButton";
import PostActionsMenu from "./PostActionsMenu";

const POST_TYPE_META = {
tip: { label: "Consiglio", icon: Lightbulb, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
recipe: { label: "Ricetta", icon: UtensilsCrossed, color: "bg-green-100 text-[#2D6A4F] dark:bg-green-950/40 dark:text-green-400" },
premium_content: { label: "Premium", icon: Lock, color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
poll: { label: "Sondaggio", icon: BarChart2, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" },
quiz: { label: "Quiz", icon: HelpCircle, color: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400" },
image_post: null,
};

export default function CommunityPostCard({ post, currentUser, onUpdate, followedEmails, onFollowChange, onHashtagFilter }) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxStartIdx, setLightboxStartIdx] = useState(0);
  const [showVideoLightbox, setShowVideoLightbox] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [poll, setPoll] = useState(null);
  const [repostCount, setRepostCount] = useState(0);

  // Load poll if post_type is poll and repost count
  useEffect(() => {
    if (post.post_type === "poll") {
      base44.entities.Poll.filter({ post_id: post.id }, "-created_date", 1).then((data) => {
        if (data[0]) setPoll(data[0]);
      }).catch(() => {});
    }

    // Load repost count
    base44.entities.PostShare.filter({ original_post_id: post.id, share_type: "repost" }, "-created_date", 500).then((data) => {
      setRepostCount(data.length);
    }).catch(() => {});
  }, [post.id, post.post_type]);

  const isLiked = post.likes?.includes(currentUser?.email);
  const isOwner = post.created_by === currentUser?.email;
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "premium" || currentUser?.role === "admin" || currentUser?.is_expert === true;
  const isBlurred = post.is_premium && !isPremiumUser;



  const handleLike = async () => {
    if (!currentUser) return toast.error("Fai login per mettere mi piace");
    const likes = post.likes || [];
    const newLikes = isLiked
      ? likes.filter((e) => e !== currentUser?.email)
      : [...likes, currentUser?.email];
    const newLikesCount = newLikes.length;
    await base44.entities.CommunityPost.update(post.id, {
      likes: newLikes,
      likes_count: newLikesCount,
    });
    
    // Create notification if user just liked the post (not unliking)
    if (!isLiked && post.created_by !== currentUser?.email) {
      await base44.functions.invoke('createLikeNotification', {
        post_id: post.id,
        post_author_email: post.created_by,
        liker_email: currentUser?.email,
        liker_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
        liker_photo: currentUser?.photo_url || null,
      }).catch(() => {});
    }
    
    onUpdate({ ...post, likes: newLikes, likes_count: newLikesCount });
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const data = await base44.entities.CommunityComment.filter({ post_id: post.id }, "-created_date", 50);
    setComments(data);
    // Sync comments_count if different from actual count
    if (data.length !== (post.comments_count || 0)) {
      const updated = { ...post, comments_count: data.length };
      await base44.entities.CommunityPost.update(post.id, { comments_count: data.length });
      onUpdate(updated);
    }
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
    const newCommentsCount = (post.comments_count || 0) + 1;
    const created = await base44.entities.CommunityComment.create({
      post_id: post.id,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
      user_photo: currentUser?.photo_url || null,
      content: newComment.trim(),
      is_expert: currentUser?.role === "expert" || currentUser?.role === "admin",
    });
    await base44.entities.CommunityPost.update(post.id, {
      comments_count: newCommentsCount,
    });
    
    // Create notification if commenting on someone else's post
    if (post.created_by !== currentUser?.email) {
      await base44.functions.invoke('createCommentNotification', {
        post_id: post.id,
        post_author_email: post.created_by,
        comment_author_email: currentUser?.email,
        comment_author_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
        comment_author_photo: currentUser?.photo_url || null,
      }).catch(() => {});
    }
    
    onUpdate({ ...post, comments_count: newCommentsCount });
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
    if (!confirm("Eliminare questo post?")) return;
    await base44.entities.CommunityPost.delete(post.id);
    onUpdate(null);
    toast.success("Post eliminato");
  };



  const displayName = getDisplayName(post.user_name, post.created_by);
  const photoUrl = getPhotoUrl(post.user_photo);
  const typeMeta = POST_TYPE_META[post.post_type] || null;

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl cursor-pointer" onClick={() => setShowModal(true)}>
      {/* Header */}
      {post.is_pinned && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 px-4 py-2 flex items-center gap-2">
          <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">📌 Fissato in alto</p>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Link
          to={`/ExpertProfile?id=${post.created_by}`}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <UserAvatar photoUrl={photoUrl} userName={displayName} size="md" />
          <div className="min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </p>
            {/* Badge — priority: admin > expert > premium */}
            {post.author_role === "admin" ? (
              <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold">👑 Admin</span>
            ) : (post.author_role === "expert" || post.is_expert === true) && post.author_role !== "admin" ? (
              <span className="text-[9px] bg-green-100 text-[#2D6A4F] dark:bg-green-950/40 dark:text-green-300 px-1.5 py-0.5 rounded-full font-bold">✅ Expert</span>
            ) : (post.author_plan === "premium" || post.author_role === "premium") ? (
              <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">⭐ Premium</span>
            ) : null}
          </div>
           <p className="text-xs text-gray-400">
             {formatTimeAgo(post.created_date)}
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
          {/* Follow button — mostra apenas se não é o próprio post */}
          {!isOwner && post.created_by && (
            <FollowButton
              targetEmail={post.created_by}
              currentUser={currentUser}
              onFollowChange={(following) => onFollowChange?.(post.created_by, following)}
            />
          )}
        </div>
      </div>

      {/* Video */}
      {post.video_url && post.media_type === "video" && (
        <div
          className={`w-full bg-gray-100 dark:bg-[#111] relative ${isBlurred ? "overflow-hidden" : ""}`}
        >
          {isBlurred ? (
            <div className="w-full aspect-video bg-black/50 flex flex-col items-center justify-center gap-2">
              <Lock className="w-8 h-8 text-white" />
              <p className="text-white font-bold text-sm">Contenuto Premium</p>
              <p className="text-white/80 text-xs">Abbonati per vedere</p>
            </div>
          ) : (
            <div onClick={(e) => { e.stopPropagation(); setShowVideoLightbox(true); }}>
              <VideoPlayer
                src={post.video_url}
                autoplay={true}
                muted={true}
                onFullscreen={() => setShowVideoLightbox(true)}
                showIcon={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Image or Images Carousel */}
      {((post.images?.length > 0) || post.image_url) && !post.video_url && (
        <div
          className={`w-full relative cursor-pointer ${isBlurred ? "overflow-hidden" : ""}`}
        >
          {post.images && post.images.length > 0 ? (
            <ImageCarousel images={post.images} isBlurred={isBlurred} />
          ) : (
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              className={`w-full object-cover ${isBlurred ? "blur-xl scale-110" : ""}`}
            />
          )}
          {isBlurred && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
              <Lock className="w-8 h-8 text-white" />
              <p className="text-white font-bold text-sm">Contenuto Premium</p>
              <p className="text-white/80 text-xs">Abbonati per vedere</p>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className={`px-4 pt-3 pb-1 relative ${isBlurred && !post.image_url ? "overflow-hidden" : ""}`}
      >
        {post.title && (
          <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{post.title}</p>
        )}
        <div className={isBlurred ? "blur-sm select-none" : ""}>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
            <MentionText text={post.content} />
            <LinkTextWithUrls text={post.content} />
          </p>
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
              <button
                key={tag}
                onClick={() => navigate(`/Hashtag?tag=${encodeURIComponent(tag)}`)}
                className="flex items-center gap-0.5 text-xs text-[#2D6A4F] font-medium hover:underline transition"
              >
                <Hash className="w-2.5 h-2.5" />
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Link preview */}
        {post.link_preview && (
          <div className="mt-3">
            <LinkPreviewCard preview={post.link_preview} />
          </div>
        )}
      </div>

      {/* Poll */}
      {poll && (
        <div className="px-4 pb-2">
          <PollCard poll={poll} currentUser={currentUser} onUpdate={setPoll} />
        </div>
      )}

      {/* Quiz */}
      {post.post_type === "quiz" && (
        <div className="px-4 pb-2">
          <QuizCard post={post} currentUser={currentUser} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <ReactionButton
          postId={post.id}
          currentUser={currentUser}
          onReactionsChange={() => {}}
        />
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition hover:text-[#2D6A4F]">
          <MessageCircle className="w-5 h-5" />
          <span>{post.comments_count || 0}</span>
        </button>
        <SavePostButton
          post={post}
          currentUser={currentUser}
          onSaveChange={() => {}}
        />
        {repostCount > 0 && (
          <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Repeat2 className="w-5 h-5" />
            <span>{repostCount}</span>
          </button>
        )}
        <div className="ml-auto">
          <PostActionsMenu
            post={post}
            currentUser={currentUser}
            onPostShared={() => setRepostCount((prev) => prev + 1)}
            onDelete={async (p) => {
              if (!confirm("Eliminare questo post?")) return;
              await base44.entities.CommunityPost.delete(p.id);
              onUpdate(null);
              toast.success("Post eliminato");
            }}
          />
        </div>
      </div>

      {/* Image lightbox */}
      {showImageLightbox && (
        <ImageLightbox
          images={post.images && post.images.length > 0 ? post.images : post.image_url ? [post.image_url] : []}
          startIndex={lightboxStartIdx}
          onClose={() => setShowImageLightbox(false)}
        />
      )}

      {/* Video lightbox */}
      {showVideoLightbox && (
        <VideoLightbox
          videoUrl={post.video_url}
          onClose={() => setShowVideoLightbox(false)}
        />
      )}

      {/* Post detail modal */}
      {showModal && (
        <PostDetailModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onUpdate={(updated) => { onUpdate(updated); }}
        />
      )}

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-100 dark:border-[#2A2A2A] px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          {currentUser && (
            <div className="flex items-center gap-2 py-3">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="Scrivi un commento..."
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
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.map((c) => {
                const commentDisplayName = getDisplayName(c.user_name, c.user_email);
                const commentPhotoUrl = getPhotoUrl(c.user_photo);
                return (
                <div key={c.id} className="flex gap-2">
                  <UserAvatar photoUrl={commentPhotoUrl} userName={commentDisplayName} size="sm" />
                  <div className="bg-gray-50 dark:bg-[#111] rounded-xl px-3 py-2 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {commentDisplayName}
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
                    );
                    })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}