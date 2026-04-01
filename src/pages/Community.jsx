import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Users, ArrowLeft, Search, RefreshCw, ChevronUp, Lock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import RepostCard from "@/components/community/RepostCard";
import NewPostModal from "@/components/community/NewPostModal";
import SuggestedUsers from "@/components/community/SuggestedUsers";
import StoriesBar from "@/components/community/StoriesBar";
import NotificationBell from "@/components/community/NotificationBell";
import TrendingHashtags from "@/components/community/TrendingHashtags";
import PostTypeFilter from "@/components/community/PostTypeFilter";
import FollowButton from "@/components/community/FollowButton";
import PremiumUpgradeModal from "@/components/community/PremiumUpgradeModal";
import MiniRankingCard from "@/components/community/MiniRankingCard";
import FeedSkeleton from "@/components/community/FeedSkeleton";

// Module-level cache so data persists between tab switches (cleared on mount)
let _cachedPosts = null;
let _cachedReposts = null;
let _cachedFollowed = null;

// Algoritmo de recomendação: posts fixados no topo (ordenados por data desc),
// depois posts normais ordenados por data decrescente (mais recentes primeiro)
function rankPosts(posts) {
  return [...posts].sort((a, b) => {
    // Posts fixados sempre no topo
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    // Ordenar sempre por created_date decrescente
    return new Date(b.created_date) - new Date(a.created_date);
  });
}

export default function Community() {
  const navigate = useNavigate();
  const feedRef = useRef(null);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState(_cachedPosts || []);
  const [allPostsLoaded, setAllPostsLoaded] = useState(false);
  const [followedEmails, setFollowedEmails] = useState(_cachedFollowed || new Set());
  const [loading, setLoading] = useState(!_cachedPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [activeTab, setActiveTab] = useState("for_you"); // "for_you" | "following"
  const [hashtagFilter, setHashtagFilter] = useState(null);
  const [postTypeFilter, setPostTypeFilter] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [reposts, setReposts] = useState(_cachedReposts || []);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [lastCheckedTime, setLastCheckedTime] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("pubblicare");
  const pullStartRef = useRef(0);
  const pageRef = useRef(1);

  const isPremiumUser = (u) =>
    u?.plan === "premium" || u?.role === "premium" || u?.role === "admin" || u?.is_expert === true;

  const handlePublishClick = () => {
    if (!isPremiumUser(user)) {
      setUpgradeReason("pubblicare");
      setShowUpgradeModal(true);
      return;
    }
    setShowNewPost(true);
  };

  const withTimeout = (promise, ms = 5000) => {
    const timer = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
    return Promise.race([promise, timer]);
  };

  const loadPosts = useCallback(async (page = 1) => {
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    try {
      const postsData = await base44.entities.CommunityPost.filter(
        { status: "active" },
        "-created_date",
        pageSize,
        skip
      ).catch(() => []);

      if (page === 1) {
        setLastCheckedTime(new Date());
        _cachedPosts = postsData;
        setPosts(postsData);
        setAllPostsLoaded(postsData.length < pageSize);
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = postsData.filter((p) => !existingIds.has(p.id));
          const updated = [...prev, ...newPosts];
          _cachedPosts = updated;
          return updated;
        });
        setAllPostsLoaded(postsData.length < pageSize);
      }
      pageRef.current = page;
    } catch (err) {
      console.error("Load posts error:", err);
    }
  }, []);

  useEffect(() => {
    // Clear cache on mount to always fetch fresh data
    _cachedPosts = null;
    _cachedReposts = null;
    _cachedFollowed = null;

    const init = async () => {
      try {
        // Phase 1: auth + posts in parallel — show feed ASAP
        const [u] = await Promise.all([
          base44.auth.me().catch(() => null),
          loadPosts(1),
        ]);
        setUser(u);
        setLoading(false);

        // Phase 2: secondary data after feed is visible
        const [followData, usersData, repostsData] = await Promise.all([
          u ? withTimeout(base44.entities.UserFollow.filter({ follower_email: u.email }, "-created_date", 200)).catch(() => []) : Promise.resolve([]),
          withTimeout(base44.entities.User.list("-created_date", 100)).catch(() => []),
          withTimeout(base44.entities.PostShare.filter({ share_type: "repost" }, "-created_date", 60)).catch(() => []),
        ]);

        const followed = new Set(followData.map((f) => f.following_email));
        _cachedFollowed = followed;
        _cachedReposts = repostsData;
        setFollowedEmails(followed);
        setReposts(repostsData);

        const suggested = usersData.filter((usr) =>
          usr.is_suggested && u && usr.email !== u.email && !followed.has(usr.email)
        );
        setSuggestedUsers(suggested);
        setSecondaryLoaded(true);
      } catch (err) {
        console.error("Feed loading error:", err);
        setLoading(false);
      }
    };
    init();
  }, [loadPosts]);

  const handleFollowChange = useCallback((targetEmail, isNowFollowing) => {
    setFollowedEmails((prev) => {
      const next = new Set(prev);
      if (isNowFollowing) next.add(targetEmail);
      else next.delete(targetEmail);
      return next;
    });
  }, []);

  const handlePostUpdate = (updated, originalId) => {
    if (updated === null) {
      setPosts((prev) => prev.filter((p) => p.id !== originalId));
    } else {
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const handleNewPost = (post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handleRepostDeleted = (repostId) => {
    setReposts((prev) => prev.filter((r) => r.id !== repostId));
  };

  // Filtra e ordena conforme a aba ativa, hashtag e tipo de post
  const displayedPosts = (() => {
    let filtered = activeTab === "following"
      ? posts.filter((p) => followedEmails.has(p.created_by))
      : posts;
    if (hashtagFilter) {
      filtered = filtered.filter((p) => p.tags?.includes(hashtagFilter));
    }
    if (postTypeFilter) {
      filtered = filtered.filter((p) => p.post_type === postTypeFilter);
    }
    return rankPosts(filtered);
  })();

  // Filtra reposts conforme filtros
  const displayedReposts = (() => {
    let filtered = reposts;
    if (activeTab === "following") {
      filtered = filtered.filter((r) => followedEmails.has(r.sharer_email));
    }
    if (hashtagFilter || postTypeFilter) {
      // Skip reposts quando há filtros específicos
      return [];
    }
    return filtered;
  })();

  // Mescla posts e reposts ordenados por data
  const allContent = [
    ...displayedPosts.map((p) => ({ type: "post", data: p, date: new Date(p.created_date) })),
    ...displayedReposts.map((r) => ({ type: "repost", data: r, date: new Date(r.created_date) })),
  ].sort((a, b) => b.date - a.date);

  // Check for new posts
  const checkNewPosts = useCallback(async () => {
    if (!lastCheckedTime) return;
    try {
      const newPosts = await base44.entities.CommunityPost.filter(
        { status: "active", created_date: { $gt: lastCheckedTime.toISOString() } },
        "-created_date",
        5
      ).catch(() => []);
      setNewPostsCount(newPosts.length);
    } catch (err) {
      console.error("Check new posts error:", err);
    }
  }, [lastCheckedTime]);

  useEffect(() => {
    const interval = setInterval(checkNewPosts, 60000); // Check every 60s
    return () => clearInterval(interval);
  }, [checkNewPosts]);

  // Pull to refresh
  const handleTouchStart = (e) => {
    const scrollTop = feedRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      pullStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (pullStartRef.current === 0) return;
    const scrollTop = feedRef.current?.scrollTop || 0;
    if (scrollTop !== 0) return;

    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - pullStartRef.current);
    setPullProgress(Math.min(diff / 100, 1));
  };

  const handleTouchEnd = async () => {
    if (pullProgress >= 0.5) {
      setLoadingMore(true);
      await loadPosts(1);
      setNewPostsCount(0);
      setLoadingMore(false);
    }
    setPullProgress(0);
    pullStartRef.current = 0;
  };

  // Infinite scroll
  const handleScroll = useCallback((e) => {
    const element = e.target;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 500 && !loadingMore && !allPostsLoaded) {
      setLoadingMore(true);
      loadPosts(pageRef.current + 1).then(() => setLoadingMore(false));
    }
  }, [loadingMore, allPostsLoaded, loadPosts]);

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Profile")} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2D6A4F]" />
              <h1 className="font-bold text-gray-900 dark:text-white text-lg">Comunità</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && <NotificationBell currentUser={user} />}
            <button
              onClick={() => navigate("/CommunityRanking")}
              className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition"
            >
              <Trophy className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/Search")}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <Search className="w-5 h-5" />
            </button>
            <Button
              size="sm"
              onClick={handlePublishClick}
              className="bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl gap-1">
              <Plus className="w-4 h-4" />
              Pubblica
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto flex px-4 pb-3 gap-4 border-b border-gray-100 dark:border-[#2A2A2A]">
          <button
            onClick={() => { setActiveTab("for_you"); setPostTypeFilter(null); }}
            className={`text-sm font-semibold pb-2 border-b-2 transition-all ${
              activeTab === "for_you"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-gray-400"
            }`}
          >
            Scopri
          </button>
          <button
            onClick={() => { setActiveTab("following"); setPostTypeFilter(null); }}
            className={`text-sm font-semibold pb-2 border-b-2 transition-all ${
              activeTab === "following"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-gray-400"
            }`}
          >
            Seguiti {followedEmails.size > 0 && <span className="text-[10px] bg-[#2D6A4F] text-white rounded-full px-1.5 py-0.5 ml-1">{followedEmails.size}</span>}
          </button>
        </div>

        {/* Post type filter */}
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
          <PostTypeFilter selected={postTypeFilter} onChange={setPostTypeFilter} />
        </div>
      </div>

      {/* Stories */}
      <div className="max-w-lg mx-auto border-b border-gray-100 dark:border-[#2A2A2A]">
        <StoriesBar currentUser={user} />
      </div>

      {/* My profile strip */}
      {user && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <Link to={`/ExpertProfile?uid=${btoa(user.email)}`} className="flex items-center gap-3 flex-shrink-0">
              {user.photo_url ? (
                <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold">
                  {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <Link to={`/ExpertProfile?uid=${btoa(user.email)}`} className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.full_name || user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-gray-400">
                {user.role === "expert" ? "✅ Expert" : user.role === "admin" ? "👑 Admin" : user.plan === "premium" ? "⭐ Premium" : "Free"}
              </p>
            </Link>
            <button
              onClick={handlePublishClick}
              className="text-xs text-gray-400 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-left flex-1 max-w-[160px] truncate flex items-center gap-1">
              {!isPremiumUser(user) && <Lock className="w-3 h-3 flex-shrink-0" />}
              Cosa stai cucinando?
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div
        ref={feedRef}
        className="max-w-lg mx-auto px-4 pb-24 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* New posts banner */}
        {newPostsCount > 0 && (
          <button
            onClick={() => { loadPosts(1); setNewPostsCount(0); feedRef.current?.scrollTo(0, 0); }}
            className="sticky top-0 z-20 w-full bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition hover:bg-[#235c43]"
          >
            <ChevronUp className="w-4 h-4" />
            {newPostsCount} nuovi post disponibili — Aggiorna
          </button>
        )}

        {/* Pull to refresh indicator */}
        {pullProgress > 0 && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-[#1A1A1A] rounded-full p-2 shadow-lg">
            <RefreshCw className={`w-5 h-5 text-[#2D6A4F] transition-transform ${pullProgress > 0 && 'animate-spin'}`} />
          </div>
        )}

        {loading ? (
          <FeedSkeleton />
        ) : (
          <>
            {/* Sugestões — só na aba "Scopri" sem filtros */}
            {activeTab === "for_you" && !hashtagFilter && !postTypeFilter && (
              <>
                {suggestedUsers.length > 0 && (
                  <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Chi seguire? 👥</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {suggestedUsers.map((sUser) => (
                        <div key={sUser.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#111] rounded-lg transition">
                          <Link
                            to={`/ExpertProfile?uid=${btoa(sUser.email)}`}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            {sUser.photo_url ? (
                              <img src={sUser.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" loading="lazy" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(sUser.display_name || sUser.email || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {sUser.display_name || sUser.email?.split("@")[0]}
                              </p>
                            </div>
                          </Link>
                          <FollowButton
                            targetEmail={sUser.email}
                            currentUser={user}
                            onFollowChange={() => {
                              setSuggestedUsers((prev) => prev.filter((u) => u.id !== sUser.id));
                              handleFollowChange(sUser.email, true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <SuggestedUsers
                  currentUser={user}
                  followedEmails={followedEmails}
                  onFollowChange={handleFollowChange}
                />
                <TrendingHashtags onHashtagClick={(tag) => setHashtagFilter(tag)} currentUser={user} />
                <MiniRankingCard />
              </>
            )}

            {/* Hashtag filter active */}
            {hashtagFilter && (
              <div className="flex items-center gap-2 bg-[#2D6A4F]/10 border border-[#2D6A4F]/30 rounded-xl px-3 py-2">
                <span className="text-sm text-[#2D6A4F] font-semibold">#{hashtagFilter}</span>
                <button onClick={() => setHashtagFilter(null)} className="ml-auto text-gray-400 text-xs">✕ Rimuovi filtro</button>
              </div>
            )}

            {allContent.length === 0 ? (
              <div className="text-center py-20">
                {activeTab === "following" ? (
                  <>
                    <p className="text-4xl mb-4">👥</p>
                    <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Nessun post da seguiti</p>
                    <p className="text-sm text-gray-400">Segui altri utenti per vedere i loro post qui</p>
                  </>
                ) : hashtagFilter ? (
                  <>
                    <p className="text-4xl mb-4">🔍</p>
                    <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Nessun post con #{hashtagFilter}</p>
                    <p className="text-sm text-gray-400">Prova un altro hashtag</p>
                  </>
                ) : postTypeFilter ? (
                  <>
                    <p className="text-4xl mb-4">📭</p>
                    <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Nessun post di questo tipo</p>
                    <p className="text-sm text-gray-400">Prova un altro filtro</p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl mb-4">🍳</p>
                    <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Nessun post ancora</p>
                    <p className="text-sm text-gray-400 mb-6">Sii il primo a condividere qualcosa!</p>
                    <Button onClick={() => setShowNewPost(true)} className="bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl">
                      Crea il primo post
                    </Button>
                  </>
                )}
              </div>
            ) : (
              allContent.map((item) =>
                item.type === "post" ? (
                  <CommunityPostCard
                    key={item.data.id}
                    post={item.data}
                    currentUser={user}
                    followedEmails={followedEmails}
                    onFollowChange={handleFollowChange}
                    onUpdate={(updated) => handlePostUpdate(updated, item.data.id)}
                    onHashtagFilter={(tag) => setHashtagFilter(tag)}
                  />
                ) : (
                  <RepostCard
                    key={item.data.id}
                    repost={item.data}
                    currentUser={user}
                    followedEmails={followedEmails}
                    onFollowChange={handleFollowChange}
                    onUpdate={(updated) => handlePostUpdate(updated, item.data.original_post_id)}
                    onHashtagFilter={(tag) => setHashtagFilter(tag)}
                  />
                )
              )
            )}

            {/* Loading indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" />
              </div>
            )}

            {/* End of feed message */}
            {allPostsLoaded && allContent.length > 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p className="text-sm font-medium">Hai visto tutti i post! 🎉</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* New post modal */}
      {showNewPost && (
        <NewPostModal
          currentUser={user}
          onClose={() => setShowNewPost(false)}
          onCreated={handleNewPost}
        />
      )}

      {/* Premium upgrade modal */}
      {showUpgradeModal && (
        <PremiumUpgradeModal
          reason={upgradeReason}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}