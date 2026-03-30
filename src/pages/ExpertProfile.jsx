import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BadgeCheck, ArrowLeft, Loader2, Heart, MessageCircle, Lock, Grid3X3, Edit3 } from "lucide-react";
import { useNavigate } from "react-router-dom";


import CommunityPostCard from "@/components/community/CommunityPostCard";
import PostDetailModal from "@/components/community/PostDetailModal";
import EditProfileModal from "@/components/EditProfileModal";
import FollowButton from "@/components/community/FollowButton";
import FollowersModal from "@/components/community/FollowersModal";
import FollowingModal from "@/components/community/FollowingModal";
import ProfileStatsCard from "@/components/community/ProfileStatsCard";

export default function ExpertProfile() {
  const [posts, setPosts] = useState([]);
  const [expert, setExpert] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("feed"); // feed | grid
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const expertEmail = params.get("id");

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setCurrentUser(u);

      if (!expertEmail) { setLoading(false); return; }

      const [postsData, followersData, followingData, userFollowData] = await Promise.all([
        base44.entities.CommunityPost.filter(
          { user_email: expertEmail, status: "active" },
          "-created_date",
          30
        ),
        base44.entities.UserFollow.filter({ following_email: expertEmail }, "-created_date", 1000),
        base44.entities.UserFollow.filter({ follower_email: expertEmail }, "-created_date", 1000),
        u && u.email !== expertEmail
          ? base44.entities.UserFollow.filter({ follower_email: u.email, following_email: expertEmail }, "-created_date", 1)
          : Promise.resolve([]),
      ]);
      
      setPosts(postsData);
      setFollowersCount(followersData.length);
      setFollowingCount(followingData.length);
      setIsFollowing(userFollowData.length > 0);

      // Use first post to build expert info
      if (postsData.length > 0) {
        setExpert({
          email: expertEmail,
          name: postsData[0].user_name || expertEmail.split("@")[0],
          photo: postsData[0].user_photo || null,
          is_expert: postsData[0].is_expert,
        });
      } else {
        setExpert({ email: expertEmail, name: expertEmail.split("@")[0], photo: null, is_expert: false });
      }

      setLoading(false);
    };
    init();
  }, [expertEmail]);

  const handlePostUpdate = (updated, originalId) => {
    if (updated === null) {
      setPosts((prev) => prev.filter((p) => p.id !== originalId));
    } else {
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const handleFollowChange = (isNowFollowing) => {
    setIsFollowing(isNowFollowing);
    setFollowersCount((prev) => isNowFollowing ? prev + 1 : prev - 1);
  };

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const premiumCount = posts.filter((p) => p.is_premium).length;
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 dark:text-white text-lg truncate">
            {expert?.name}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Profile card */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-start gap-4">
            {expert?.photo ? (
              <img src={expert.photo} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[#2D6A4F]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center text-white font-bold text-2xl border-2 border-[#2D6A4F]">
                {(expert?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">{expert?.name}</h2>
                {expert?.is_expert && (
                  <BadgeCheck className="w-5 h-5 text-[#2D6A4F]" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-medium">
                  {expert?.is_expert
                    ? <span className="text-[#2D6A4F]">✅ Expert</span>
                    : expertEmail === currentUser?.email
                      ? (currentUser?.plan === "premium"
                          ? <span className="text-purple-600">⭐ Premium</span>
                          : <span className="text-gray-400">Free</span>)
                      : <span className="text-gray-400">Membro</span>
                  }
                </p>
                {expertEmail !== currentUser?.email ? (
                    <FollowButton
                      targetEmail={expertEmail}
                      currentUser={currentUser}
                      onFollowChange={handleFollowChange}
                    />
                  ) : (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/30 hover:bg-[#2D6A4F]/20 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      Modifica
                    </button>
                  )}
              </div>

              {/* Stats */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2A2A2A]">
                <ProfileStatsCard userEmail={expertEmail} />
              </div>

              {/* Followers/Following buttons */}
              <div className="flex gap-3 mt-3">
                <button onClick={() => setShowFollowersModal(true)} className="flex-1 py-2.5 px-3 rounded-xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/30 hover:bg-[#2D6A4F]/20 transition text-center">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{followersCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Follower</p>
                </button>
                <button onClick={() => setShowFollowingModal(true)} className="flex-1 py-2.5 px-3 rounded-xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/30 hover:bg-[#2D6A4F]/20 transition text-center">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{followingCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Seguiti</p>
                </button>
              </div>
            </div>
          </div>

          {/* Premium banner for non-premium users when expert has premium content */}
          {premiumCount > 0 && !isPremiumUser && (
            <div className="mt-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  {premiumCount} contenut{premiumCount === 1 ? "o" : "i"} premium esclusiv{premiumCount === 1 ? "o" : "i"}
                </p>
                <p className="text-xs text-purple-500">Abbonati a Premium per accedere</p>
              </div>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex border-t border-gray-100 dark:border-[#2A2A2A]">
          <button
            onClick={() => setView("feed")}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              view === "feed"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-gray-400"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Feed
          </button>
          <button
            onClick={() => setView("grid")}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              view === "grid"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-gray-400"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            Galleria
          </button>
        </div>

        {/* Content */}
        {posts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-4xl mb-3">🍳</p>
            <p className="text-gray-400 text-sm">Nessun post ancora</p>
          </div>
        ) : view === "feed" ? (
          <div className="px-4 py-4 space-y-4 pb-24">
            {posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onUpdate={(updated) => handlePostUpdate(updated, post.id)}
              />
            ))}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-3 gap-0.5 pb-24">
            {posts.map((post) => (
              <button key={post.id} onClick={() => setSelectedPost(post)} className="relative aspect-square bg-gray-100 dark:bg-[#1A1A1A] overflow-hidden hover:opacity-80 transition">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt=""
                    className={`w-full h-full object-cover ${post.is_premium && !isPremiumUser ? "blur-lg" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-[#1A1A1A]">
                    <p className="text-gray-300 text-xs text-center px-1 line-clamp-3">{post.content}</p>
                  </div>
                )}
                {post.is_premium && !isPremiumUser && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <Lock className="w-5 h-5 text-white" />
                   </div>
                 )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onUpdate={(updated) => handlePostUpdate(updated, selectedPost.id)}
        />
      )}

      {showEditModal && currentUser && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            base44.auth.me().then(setCurrentUser).catch(() => {});
          }}
        />
      )}

      {showFollowersModal && (
        <FollowersModal
          expertEmail={expertEmail}
          onClose={() => setShowFollowersModal(false)}
          currentUser={currentUser}
        />
      )}

      {showFollowingModal && (
        <FollowingModal
          expertEmail={expertEmail}
          onClose={() => setShowFollowingModal(false)}
          currentUser={currentUser}
        />
      )}
    </div>
    );
  }