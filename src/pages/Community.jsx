import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Users, ArrowLeft, Search, RefreshCw, ChevronUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import RepostCard from "@/components/community/RepostCard";
import NewPostModal from "@/components/community/NewPostModal";
import SuggestedUsers from "@/components/community/SuggestedUsers";

import NotificationBell from "@/components/community/NotificationBell";
import TrendingHashtags from "@/components/community/TrendingHashtags";
import PostTypeFilter from "@/components/community/PostTypeFilter";
import FollowButton from "@/components/community/FollowButton";
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
  const [reposts, setReposts] = useState([]);
  const [followedEmails, setFollowedEmails] = useState(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allPostsLoaded, setAllPostsLoaded] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("pubblicare");
  const [activeTab, setActiveTab] = useState("for_you");
  const [hashtagFilter, setHashtagFilter] = useState(null);
  const [postTypeFilter, setPostTypeFilter] = useState(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [newPostsCount, setNewPostsCount] = useState(0);
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
      const [u] = await Promise.all([
        base44.auth.me().catch(() => null),
        loadPosts(1),
      ]);
      setUser(u);
      setLoading(false);

      // Lazy load secondary data after initial render
      setTimeout(async () => {
        const [followData, usersData, repostsData] = await Promise.all([
          u ? base44.entities.UserFollow.filter({ follower_email: u.email }, "-created_date", 200).catch(() => []) : Promise.resolve([]),
          base44.entities.User.list("-created_date", 100).catch(() => []),
          base44.entities.PostShare.filter({ share_type: "repost" }, "-created_date", 60).catch(() => []),
        ]);

        const followed = new Set(followData.map((f) => f.following_email));
        setFollowedEmails(followed);
        setReposts(repostsData);

        const suggested = usersData.filter(
          (usr) => usr.is_suggested && u && usr.email !== u.email && !followed.has(usr.email)
        );
        setSuggestedUsers(suggested);
      }, 100);
    };
    init();
  }, [loadPosts]);

  // Poll for new posts every 60s
  const checkNewPosts = useCallback(async () => {
    if (!lastCheckedTime) return;
    const data = await base44.entities.CommunityPost.filter(
      { status: "active", created_date: { $gt: lastCheckedTime.toISOString() } },
      "-created_date",
      5
    ).catch(() => []);
    setNewPostsCount(data.length);
  }, [lastCheckedTime]);

  useEffect(() => {
    const interval = setInterval(checkNewPosts, 60000);
    return () => clearInterval(interval);
  }, [checkNewPosts]);

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

  const handleNewPost = (post) => setPosts((prev) => [post, ...prev]);

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
      setNewPostsCount(0);
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

  // Filtered display (maintain exact order from DB)
  const displayedPosts = (() => {
    let filtered = activeTab === "following"
      ? posts.filter((p) => followedEmails.has(p.created_by))
      : posts;
    if (hashtagFilter) filtered = filtered.filter((p) => p.tags?.includes(hashtagFilter));
    if (postTypeFilter) filtered = filtered.filter((p) => p.post_type === postTypeFilter);
    return rankPosts(filtered);
  })();

  const displayedReposts = (() => {
    if (hashtagFilter || postTypeFilter) return [];
    let filtered = reposts;
    if (activeTab === "following") filtered = filtered.filter((r) => followedEmails.has(r.sharer_email));
    return filtered;
  })();

  const allContent = [
    ...displayedPosts.map((p) => ({ type: "post", data: p, date: new Date(p.created_date) })),
    ...displayedReposts.map((r) => ({ type: "repost", data: r, date: new Date(r.created_date) })),
  ];

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
               <button onClick={() => navigate("/Search")} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition">
              <Search className="w-5 h-5" />
            </button>
            <Button size="sm" onClick={handlePublishClick} className="bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl gap-1">
              <Plus className="w-4 h-4" />
              Pubblica
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto flex px-4 pb-3 gap-4 border-b border-gray-100 dark:border-[#2A2A2A]">
          <button
            onClick={() => { setActiveTab("for_you"); setPostTypeFilter(null); }}
            className={`text-sm font-semibold pb-2 border-b-2 transition-all ${activeTab === "for_you" ? "border-[#2D6A4F] text-[#2D6A4F]" : "border-transparent text-gray-400"}`}
          >
            Scopri
          </button>
          <button
            onClick={() => { setActiveTab("following"); setPostTypeFilter(null); }}
            className={`text-sm font-semibold pb-2 border-b-2 transition-all ${activeTab === "following" ? "border-[#2D6A4F] text-[#2D6A4F]" : "border-transparent text-gray-400"}`}
          >
            Seguiti {followedEmails.size > 0 && <span className="text-[10px] bg-[#2D6A4F] text-white rounded-full px-1.5 py-0.5 ml-1">{followedEmails.size}</span>}
          </button>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
          <PostTypeFilter selected={postTypeFilter} onChange={setPostTypeFilter} />
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
        {newPostsCount > 0 && (
          <button
            onClick={() => { loadPosts(1); setNewPostsCount(0); feedRef.current?.scrollTo(0, 0); }}
            className="sticky top-0 z-20 w-full bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition hover:bg-[#235c43]"
          >
            <ChevronUp className="w-4 h-4" />
            {newPostsCount} nuovi post disponibili — Aggiorna
          </button>
        )}

        {pullProgress > 0 && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-[#1A1A1A] rounded-full p-2 shadow-lg">
            <RefreshCw className="w-5 h-5 text-[#2D6A4F] animate-spin" />
          </div>
        )}

        {loading ? (
          <FeedSkeleton />
        ) : (
          <>
            {activeTab === "for_you" && !hashtagFilter && !postTypeFilter && (
              <>
                {suggestedUsers.length > 0 && (
                   <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4">
                     <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Chi seguire? 👥</h3>
                     <div className="space-y-2 max-h-64 overflow-y-auto">
                       {suggestedUsers.map((sUser) => (
                         <div key={sUser.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#111] rounded-lg transition">
                           <Link to={`/ExpertProfile?uid=${btoa(sUser.email)}`} className="flex items-center gap-2 flex-1 min-w-0">
                             {sUser.photo_url ? (
                               <img src={sUser.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" loading="lazy" />
                             ) : (
                               <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                 {(sUser.display_name || "U").charAt(0).toUpperCase()}
                               </div>
                             )}
                             <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                               {sUser.display_name || sUser.full_name || "Utente"}
                             </p>
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
                 <SuggestedUsers currentUser={user} followedEmails={followedEmails} onFollowChange={handleFollowChange} />
                 <TrendingHashtags onHashtagClick={(tag) => setHashtagFilter(tag)} currentUser={user} />
              </>
            )}

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

            {loadingMore && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" />
              </div>
            )}

            {allPostsLoaded && allContent.length > 0 && (
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