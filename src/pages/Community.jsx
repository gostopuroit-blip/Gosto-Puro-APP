import { useRef, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Users, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import NewPostModal from "@/components/community/NewPostModal";
import PremiumUpgradeModal from "@/components/community/PremiumUpgradeModal";
import FeedSkeleton from "@/components/community/FeedSkeleton";

function rankPosts(posts) {
  return [...posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });
}

const isPremiumUser = (u) =>
  u?.plan === "premium" || u?.role === "premium" || u?.role === "admin" || u?.is_expert === true;

export default function Community() {
  const navigate = useNavigate();
  const feedRef = useRef(null);
  const pageRef = useRef(1);
  const pullStartRef = useRef(0);

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allPostsLoaded, setAllPostsLoaded] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("pubblicare");
  const [pullProgress, setPullProgress] = useState(0);
  const [lastCheckedTime, setLastCheckedTime] = useState(null);

  const loadPosts = useCallback(async (page = 1) => {
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    const data = await base44.entities.CommunityPost.filter(
      { status: "active" },
      "-created_date",
      pageSize,
      skip
    ).catch(() => []);

    if (page === 1) {
      setLastCheckedTime(new Date());
      setPosts(data);
      setAllPostsLoaded(data.length < pageSize);
    } else {
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...data.filter((p) => !ids.has(p.id))];
        return merged;
      });
      setAllPostsLoaded(data.length < pageSize);
    }
    pageRef.current = page;
  }, []);

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      await loadPosts(1);
      setLoading(false);
    };
    init();
  }, [loadPosts]);

  // Poll for new posts
  const checkNewPosts = useCallback(async () => {
    if (!lastCheckedTime) return;
    const data = await base44.entities.CommunityPost.filter(
      { status: "active", created_date: { $gt: lastCheckedTime.toISOString() } },
      "-created_date",
      5
    ).catch(() => []);
    // Could add toast notification here if desired
  }, [lastCheckedTime]);

  useEffect(() => {
    const interval = setInterval(checkNewPosts, 60000);
    return () => clearInterval(interval);
  }, [checkNewPosts]);

  const handlePublishClick = () => {
    if (!isPremiumUser(user)) {
      setUpgradeReason("pubblicare");
      setShowUpgradeModal(true);
      return;
    }
    setShowNewPost(true);
  };

  // Pull to refresh
  const handleTouchStart = (e) => {
    if ((feedRef.current?.scrollTop || 0) === 0) {
      pullStartRef.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e) => {
    if (pullStartRef.current === 0 || (feedRef.current?.scrollTop || 0) !== 0) return;
    const diff = Math.max(0, e.touches[0].clientY - pullStartRef.current);
    setPullProgress(Math.min(diff / 100, 1));
  };
  const handleTouchEnd = async () => {
    if (pullProgress >= 0.5) {
      setLoadingMore(true);
      await loadPosts(1);
      setLoadingMore(false);
    }
    setPullProgress(0);
    pullStartRef.current = 0;
  };

  // Infinite scroll
  const handleScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 500 && !loadingMore && !allPostsLoaded) {
      setLoadingMore(true);
      loadPosts(pageRef.current + 1).then(() => setLoadingMore(false));
    }
  }, [loadingMore, allPostsLoaded, loadPosts]);

  const displayedPosts = rankPosts(posts);

  const handlePostUpdate = (updated, originalId) => {
    if (updated === null) {
      setPosts((prev) => prev.filter((p) => p.id !== originalId));
    } else {
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const handleNewPost = (post) => setPosts((prev) => [post, ...prev]);

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
            <Button size="sm" onClick={handlePublishClick} className="bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl gap-1">
              <Plus className="w-4 h-4" />
              Pubblica
            </Button>
        </div>
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
                  {(user.full_name || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <Link to={`/ExpertProfile?uid=${btoa(user.email)}`} className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.full_name || "Utente"}
              </p>
              <p className="text-xs text-gray-400">
                {user.role === "admin" ? "👑 Admin" : user.role === "expert" || user.is_expert ? "✅ Expert" : user.plan === "premium" ? "⭐ Premium" : "Free"}
              </p>
            </Link>
            <button
              onClick={handlePublishClick}
              className="text-xs text-gray-400 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-left flex-1 max-w-[160px] truncate flex items-center gap-1"
            >
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
        {pullProgress > 0 && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-[#1A1A1A] rounded-full p-2 shadow-lg">
            <RefreshCw className="w-5 h-5 text-[#2D6A4F] animate-spin" />
          </div>
        )}

        {loading ? (
          <FeedSkeleton />
        ) : displayedPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🍳</p>
            <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Nessun post ancora</p>
            <p className="text-sm text-gray-400 mb-6">Sii il primo a condividere qualcosa!</p>
            <Button onClick={() => setShowNewPost(true)} className="bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl">
              Crea il primo post
            </Button>
          </div>
        ) : (
          <>
            {displayedPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                currentUser={user}
                onUpdate={(updated) => handlePostUpdate(updated, post.id)}
              />
            ))}
            {loadingMore && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" />
              </div>
            )}
            {allPostsLoaded && displayedPosts.length > 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p className="text-sm font-medium">Hai visto tutti i post! 🎉</p>
              </div>
            )}
          </>
        )}
      </div>

      {showNewPost && (
        <NewPostModal currentUser={user} onClose={() => setShowNewPost(false)} onCreated={handleNewPost} />
      )}

      {showUpgradeModal && (
        <PremiumUpgradeModal reason={upgradeReason} onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}