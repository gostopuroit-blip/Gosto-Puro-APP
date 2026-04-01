import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BadgeCheck, ArrowLeft, Loader2, Lock, Grid3X3, Edit3, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import { getDisplayName, getPhotoUrl } from "@/lib/userDisplayUtils";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import PostDetailModal from "@/components/community/PostDetailModal";
import EditProfileModal from "@/components/EditProfileModal";
import FollowButton from "@/components/community/FollowButton";
import FollowersModal from "@/components/community/FollowersModal";
import FollowingModal from "@/components/community/FollowingModal";
import ProfileStatsCard from "@/components/community/ProfileStatsCard";
import SavedPostsTab from "@/components/community/SavedPostsTab";

export default function ExpertProfile() {
  const [posts, setPosts] = useState([]);
  const [expert, setExpert] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("feed");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const uidParam = params.get("uid");
  const idParam = params.get("id");

  const expertEmail = (() => {
    if (uidParam) { try { return atob(uidParam); } catch { return uidParam; } }
    return idParam || null;
  })();

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setCurrentUser(u);

      if (!expertEmail) { setLoading(false); return; }

      // Fetch posts by user_email, followers and following in parallel
      const [postsData, followersData, followingData, allUsers] = await Promise.all([
        base44.entities.CommunityPost.filter({ user_email: expertEmail }, "-created_date", 50).catch(() => []),
        base44.entities.UserFollow.filter({ following_email: expertEmail }, "-created_date", 1000).catch(() => []),
        base44.entities.UserFollow.filter({ follower_email: expertEmail }, "-created_date", 1000).catch(() => []),
        base44.entities.User.list().catch(() => []),
      ]);

      const userFollowData = u && u.email !== expertEmail
        ? await base44.entities.UserFollow.filter({ follower_email: u.email, following_email: expertEmail }, "-created_date", 1).catch(() => [])
        : [];

      // Deduplicate followers/following by email
      const uniqueFollowers = [...new Map(followersData.map((f) => [f.follower_email, f])).values()];
      const uniqueFollowing = [...new Map(followingData.map((f) => [f.following_email, f])).values()];

      setPosts(postsData);
      setFollowersCount(uniqueFollowers.length);
      setFollowingCount(uniqueFollowing.length);
      setIsFollowing(userFollowData.length > 0);

      const expertUser = allUsers.find((usr) => usr.email === expertEmail);
      const isOwnProfile = u?.email === expertEmail;

      const resolvedPhoto = isOwnProfile
        ? (u?.photo_url || expertUser?.photo_url || postsData[0]?.user_photo || null)
        : (expertUser?.photo_url || postsData[0]?.user_photo || null);
      
      // Safe name resolution — let getDisplayName handle corruption detection
      let safeName = isOwnProfile
        ? (u?.display_name || u?.full_name)
        : postsData[0]?.user_name;
      
      if (!safeName) {
        safeName = expertUser?.display_name || expertUser?.full_name;
      }
      
      const displayName = getDisplayName(safeName, expertEmail);
      
      const resolvedRole = isOwnProfile
        ? (u?.role || expertUser?.role || null)
        : (expertUser?.role || null);
      const resolvedPlan = isOwnProfile
        ? (u?.plan || expertUser?.plan || null)
        : (expertUser?.plan || null);

      setExpert({
        email: expertEmail,
        name: getDisplayName(displayName, expertEmail),
        photo: getPhotoUrl(resolvedPhoto),
        is_expert: expertUser?.is_expert || postsData[0]?.is_expert || false,
        role: resolvedRole,
        plan: resolvedPlan,
      });

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
            <div className="border-2 border-[#2D6A4F] rounded-full">
              <UserAvatar photoUrl={getPhotoUrl(expert?.photo)} userName={expert?.name || "U"} size="xl" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">{expert?.name}</h2>
                {expert?.is_expert && <BadgeCheck className="w-5 h-5 text-[#2D6A4F]" />}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-medium">
                  {expert?.role === "admin"
                    ? <span className="text-purple-600">👑 Admin</span>
                    : (expert?.is_expert === true || expert?.role === "expert")
                    ? <span className="text-[#2D6A4F]">✅ Expert</span>
                    : (expert?.plan === "premium" || expert?.role === "premium")
                    ? <span className="text-amber-600">⭐ Premium</span>
                    : <span className="text-gray-400">Basic</span>
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

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2A2A2A]">
                <ProfileStatsCard
                  userEmail={expertEmail}
                  postCount={posts.length}
                  followerCount={followersCount}
                  followingCount={followingCount}
                  onPostClick={() => {}}
                  onFollowerClick={() => setShowFollowersModal(true)}
                  onFollowingClick={() => setShowFollowingModal(true)}
                />
              </div>
            </div>
          </div>

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
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${view === "feed" ? "border-[#2D6A4F] text-[#2D6A4F]" : "border-transparent text-gray-400"}`}
          >
            Feed
          </button>
          <button
            onClick={() => setView("grid")}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${view === "grid" ? "border-[#2D6A4F] text-[#2D6A4F]" : "border-transparent text-gray-400"}`}
          >
            <Grid3X3 className="w-4 h-4" />
            Galleria
          </button>
          {expertEmail === currentUser?.email && (
            <button
              onClick={() => setView("saved")}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${view === "saved" ? "border-[#2D6A4F] text-[#2D6A4F]" : "border-transparent text-gray-400"}`}
            >
              <Bookmark className="w-4 h-4" />
              Salvati
            </button>
          )}
        </div>

        {/* Saved tab */}
        {view === "saved" && currentUser && (
          <div className="px-4 py-4 pb-24">
            <SavedPostsTab currentUser={currentUser} />
          </div>
        )}

        {/* Content */}
        {view !== "saved" && posts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-4xl mb-3">🍳</p>
            <p className="text-gray-400 text-sm">Nessun post ancora</p>
          </div>
        ) : view !== "saved" && view === "feed" ? (
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
        ) : view !== "saved" ? (
          <div className="grid grid-cols-3 gap-0.5 pb-24">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square bg-gray-100 dark:bg-[#1A1A1A] overflow-hidden hover:opacity-80 transition"
              >
                {post.image_url || (post.images && post.images.length > 0) ? (
                  <img
                    src={post.images?.[0] || post.image_url}
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
        ) : null}
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