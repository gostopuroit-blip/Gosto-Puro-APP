import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Users, ArrowLeft, Search, Pin } from "lucide-react";
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

// Algoritmo de recomendação: posts fixados no topo,
// depois posts de quem você segue, experts/admin, mais curtidos, depois os mais recentes
function rankPosts(posts, followedEmails) {
  return [...posts].sort((a, b) => {
    // Posts fixados sempre no topo
    if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;

    const aFollowed = followedEmails.has(a.created_by) ? 1 : 0;
    const bFollowed = followedEmails.has(b.created_by) ? 1 : 0;
    if (aFollowed !== bFollowed) return bFollowed - aFollowed;

    const aExpert = a.is_expert ? 1 : 0;
    const bExpert = b.is_expert ? 1 : 0;
    if (aExpert !== bExpert) return bExpert - aExpert;

    // Mix: likes + recência (posts das últimas 24h têm bônus)
    const now = Date.now();
    const aAge = (now - new Date(a.created_date).getTime()) / 3600000; // horas
    const bAge = (now - new Date(b.created_date).getTime()) / 3600000;
    const aScore = (a.likes_count || 0) + (aAge < 24 ? 5 : 0);
    const bScore = (b.likes_count || 0) + (bAge < 24 ? 5 : 0);
    return bScore - aScore;
  });
}

export default function Community() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followedEmails, setFollowedEmails] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [activeTab, setActiveTab] = useState("for_you"); // "for_you" | "following"
  const [hashtagFilter, setHashtagFilter] = useState(null);
  const [postTypeFilter, setPostTypeFilter] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [reposts, setReposts] = useState([]);

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      const [postsData, followData, usersData, repostsData] = await Promise.all([
        base44.entities.CommunityPost.filter({ status: "active" }, "-created_date", 60),
        u ? base44.entities.UserFollow.filter({ follower_email: u.email }, "-created_date", 200) : Promise.resolve([]),
        base44.entities.User.list("-created_date", 100),
        base44.entities.PostShare.filter({ share_type: "repost" }, "-created_date", 60),
      ]);
      const followed = new Set(followData.map((f) => f.following_email));
      setFollowedEmails(followed);
      setPosts(postsData);
      setReposts(repostsData);
      
      // Get suggested users not yet followed
      const suggested = usersData.filter((usr) => 
        usr.is_suggested && u && usr.email !== u.email && !followed.has(usr.email)
      );
      setSuggestedUsers(suggested);
      
      setLoading(false);
    };
    init();
  }, []);

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
    return rankPosts(filtered, followedEmails);
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
              onClick={() => navigate("/Search")}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <Search className="w-5 h-5" />
            </button>
            <Button
              size="sm"
              onClick={() => setShowNewPost(true)}
              className="bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl gap-1">
              <Plus className="w-4 h-4" />
              Post
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
            <Link to={`/ExpertProfile?id=${user.email}`} className="flex items-center gap-3 flex-shrink-0">
              {user.photo_url ? (
                <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold">
                  {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <Link to={`/ExpertProfile?id=${user.email}`} className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.full_name || user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-gray-400">
                {user.role === "expert" ? "✅ Expert" : user.role === "admin" ? "👑 Admin" : user.plan === "premium" ? "⭐ Premium" : "Free"}
              </p>
            </Link>
            <button
              onClick={() => setShowNewPost(true)}
              className="text-xs text-gray-400 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-left flex-1 max-w-[160px] truncate">
              Cosa stai cucinando?
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="max-w-lg mx-auto px-4 pb-24 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
          </div>
        ) : (
          <>
            {/* Sugestões — só na aba "Scopri" sem filtros */}
            {activeTab === "for_you" && !hashtagFilter && !postTypeFilter && (
              <>
                {suggestedUsers.length > 0 && (
                  <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Quem Seguir? 👥</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {suggestedUsers.map((sUser) => (
                        <div key={sUser.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#111] rounded-lg transition">
                          <Link
                            to={`/ExpertProfile?id=${sUser.email}`}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            {sUser.photo_url ? (
                              <img src={sUser.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
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
              </>
            )}

            {/* Hashtag filter active */}
            {hashtagFilter && (
              <div className="flex items-center gap-2 bg-[#2D6A4F]/10 border border-[#2D6A4F]/30 rounded-xl px-3 py-2">
                <span className="text-sm text-[#2D6A4F] font-semibold">#{hashtagFilter}</span>
                <button onClick={() => setHashtagFilter(null)} className="ml-auto text-gray-400 text-xs">✕ Rimuovi filtro</button>
              </div>
            )}

            {displayedPosts.length === 0 ? (
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
            ) : allContent.length === 0 ? (
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
    </div>
  );
}