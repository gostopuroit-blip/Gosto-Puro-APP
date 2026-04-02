import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, Lock, Pin, MoreVertical, Bookmark } from "lucide-react";
import UserAvatar from "../UserAvatar";
import { getDisplayName, getPhotoUrl, getUserName } from "@/lib/userDisplayUtils";
import ImageCarousel from "./ImageCarousel";
import ImageLightbox from "./ImageLightbox";
import VideoPlayer from "./VideoPlayer";
import VideoLightbox from "./VideoLightbox";
import SavePostModal from "./SavePostModal";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/communityUtils";
import { Link, useNavigate } from "react-router-dom";
import PostDetailModal from "./PostDetailModal";

export default function CommunityPostCard({ post, currentUser, onUpdate, savedPostIds = [], userReactionPostIds = [] }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxStartIdx, setLightboxStartIdx] = useState(0);
  const [showVideoLightbox, setShowVideoLightbox] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count || 0);
  const [localIsLiked, setLocalIsLiked] = useState(() => userReactionPostIds.includes(post.id));
  const [isSaved, setIsSaved] = useState(() => savedPostIds.includes(post.id));

  // Sync if parent arrays change (e.g. after refresh)
  useEffect(() => { setLocalIsLiked(userReactionPostIds.includes(post.id)); }, [userReactionPostIds, post.id]);
  useEffect(() => { setIsSaved(savedPostIds.includes(post.id)); }, [savedPostIds, post.id]);

  const isLiked = localIsLiked;
  const isOwner = post.created_by === currentUser?.email;
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "premium" || currentUser?.role === "admin" || currentUser?.is_expert === true;
  const isBlurred = post.is_premium && !isPremiumUser;

  const handleLike = async () => {
    if (!currentUser) return toast.error("Fai login per mettere mi piace");
    if (!currentUser.email || !currentUser.email.includes('@')) return;
    try {
      if (localIsLiked) {
        const reactions = await base44.entities.PostReaction.filter({ post_id: post.id, user_email: currentUser.email }, "-created_date", 1);
        if (reactions.length > 0) await base44.entities.PostReaction.delete(reactions[0].id);
        setLocalIsLiked(false);
        setLocalLikesCount((c) => Math.max(0, c - 1));
      } else {
        await base44.entities.PostReaction.create({ post_id: post.id, user_email: currentUser.email, reaction: "❤️" });
        setLocalIsLiked(true);
        setLocalLikesCount((c) => c + 1);
        if (post.created_by !== currentUser?.email) {
          base44.functions.invoke('createLikeNotification', {
            post_id: post.id,
            post_author_email: post.created_by,
            liker_email: currentUser?.email,
            liker_name: getUserName(currentUser),
            liker_photo: currentUser?.photo_url || null,
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Errore nel mettere mi piace');
    }
  };

  const deletePost = async () => {
    if (!confirm("Eliminare questo post?")) return;
    await base44.entities.CommunityPost.delete(post.id);
    onUpdate(null);
    toast.success("Post eliminato");
  };

  const toggleSavePost = async () => {
    if (!currentUser) return toast.error("Fai login per salvare i post");
    if (isSaved) {
      setSavingPost(true);
      try {
        const saved = await base44.entities.SavedPost.filter(
          { post_id: post.id, user_email: currentUser.email },
          "-created_date",
          100
        ).catch(() => []);
        if (saved.length > 0) {
          await Promise.all(saved.map((s) => base44.entities.SavedPost.delete(s.id)));
          setIsSaved(false);
          toast.success("Post rimosso dai salvati");
        }
      } catch (error) {
        console.error('Save post error:', error);
        toast.error('Errore nel salvare il post');
      } finally {
        setSavingPost(false);
      }
    } else {
      setShowSaveModal(true);
    }
  };

  const displayName = getDisplayName(post.user_name, post.created_by);
  const photoUrl = getPhotoUrl(post.user_photo);

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl cursor-pointer w-full overflow-x-hidden" onClick={() => setShowModal(true)}>
      {post.is_pinned && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 px-4 py-2 flex items-center gap-2">
          <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">📌 Fissato in alto</p>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Link
          to={`/ExpertProfile?uid=${post.user_email && post.user_email.includes('@') ? btoa(post.user_email) : (post.author_id || "")}`}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <UserAvatar photoUrl={photoUrl} userName={displayName} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {displayName}
              </p>
              {(() => {
                const isOwnPost = currentUser && post.created_by === currentUser.email;
                const role = isOwnPost ? currentUser.role : post.author_role;
                const plan = isOwnPost ? currentUser.plan : post.author_plan;
                const isExpert = isOwnPost ? currentUser.is_expert : post.is_expert;
                if (role === "admin") return <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold">👑 Admin</span>;
                if (role === "expert" || isExpert) return <span className="text-[9px] bg-green-100 text-[#2D6A4F] dark:bg-green-950/40 dark:text-green-300 px-1.5 py-0.5 rounded-full font-bold">✅ Expert</span>;
                if (plan === "premium" || role === "premium") return <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">⭐ Premium</span>;
                return null;
              })()}
            </div>
            <p className="text-xs text-gray-400">
              {formatTimeAgo(post.created_date)}
            </p>
          </div>
        </Link>
      </div>

      {/* Video */}
      {post.video_url && post.media_type === "video" && (
        <div className={`w-full bg-gray-100 dark:bg-[#111] relative ${isBlurred ? "overflow-hidden" : ""}`}>
          {isBlurred ? (
            <div className="w-full aspect-video bg-black/50 flex flex-col items-center justify-center gap-2">
              <Lock className="w-8 h-8 text-white" />
              <p className="text-white font-bold text-sm">Contenuto Premium</p>
              <p className="text-white/80 text-xs">Abbonati per vedere</p>
            </div>
          ) : (
            <div onClick={(e) => { e.stopPropagation(); setShowVideoLightbox(true); }}>
              <VideoPlayer src={post.video_url} autoplay={true} muted={true} onFullscreen={() => setShowVideoLightbox(true)} showIcon={true} />
            </div>
          )}
        </div>
      )}

      {/* Image or Images Carousel */}
      {((post.images?.length > 0) || post.image_url) && !post.video_url && (
        <div style={{ width: "100%", aspectRatio: "4/5", overflow: "hidden", position: "relative", cursor: "pointer" }}>
          {post.images && post.images.length > 0 ? (
            <ImageCarousel images={post.images} isBlurred={isBlurred} />
          ) : (
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              className={isBlurred ? "blur-xl scale-110" : ""}
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
      <div className={`px-4 pt-3 pb-1 relative ${isBlurred && !post.image_url ? "overflow-hidden" : ""}`}>
        {post.title && (
          <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{post.title}</p>
        )}
        <div className={isBlurred ? "blur-sm select-none" : ""}>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{post.content}</p>
        </div>
        {isBlurred && (
          <div className="mt-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">🔒 Contenuto esclusivo Premium</p>
            <p className="text-xs text-purple-500 mt-0.5">Passa a Premium per accedere a tutti i contenuti</p>
          </div>
        )}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
            {post.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => navigate(`/Hashtag?tag=${encodeURIComponent(tag)}`)}
                className="text-xs text-[#2D6A4F] bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 px-2 py-0.5 rounded-full font-semibold hover:bg-[#2D6A4F]/20 transition"
              >
                #&thinsp;{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition ${isLiked ? "text-red-500" : "text-gray-500 dark:text-gray-400 hover:text-red-500"}`}>
          <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500" : ""}`} />
          <span>{localLikesCount}</span>
        </button>
        <button
          onClick={toggleSavePost}
          disabled={savingPost}
          className={`flex items-center gap-1.5 text-sm font-medium transition ${isSaved ? "text-[#2D6A4F]" : "text-gray-500 dark:text-gray-400 hover:text-[#2D6A4F]"}`}>
          <Bookmark className={`w-5 h-5 ${isSaved ? "fill-[#2D6A4F]" : ""}`} />
        </button>
        <button className="ml-auto text-gray-500 dark:text-gray-400 p-1 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {showImageLightbox && (
        <ImageLightbox
          images={post.images && post.images.length > 0 ? post.images : post.image_url ? [post.image_url] : []}
          startIndex={lightboxStartIdx}
          onClose={() => setShowImageLightbox(false)}
        />
      )}

      {showVideoLightbox && (
        <VideoLightbox videoUrl={post.video_url} onClose={() => setShowVideoLightbox(false)} />
      )}

      {showModal && (
        <PostDetailModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onUpdate={(updated) => { onUpdate(updated); }}
        />
      )}

      {showSaveModal && (
        <SavePostModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => {
            setIsSaved(true);
            setShowSaveModal(false);
          }}
        />
      )}

    </div>
  );
}