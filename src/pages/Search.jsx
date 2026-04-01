import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Search as SearchIcon, Loader2, User, FileText, Hash } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import FollowButton from "@/components/community/FollowButton";

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("posts"); // posts | users | hashtags
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [followedEmails, setFollowedEmails] = useState(new Set());

  // Load current user
  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setCurrentUser(u);
      if (u) {
        const followData = await base44.entities.UserFollow.filter({ follower_email: u.email }, "-created_date", 50).catch(() => []);
        setFollowedEmails(new Set(followData.map((f) => f.following_email)));
      }
    };
    init();
  }, []);

  // Load trending hashtags when empty
  useEffect(() => {
    const loadTrending = async () => {
      const trending = await base44.entities.Hashtag.filter({ is_trending: true }, "-posts_count", 10).catch(() => []);
      setTrendingHashtags(trending);
    };
    if (!query.trim()) {
      loadTrending();
    }
  }, [query]);

  // Search function with debounce
  const performSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setPosts([]);
        setUsers([]);
        setHashtags([]);
        return;
      }

      setLoading(true);
      const lowerQuery = searchQuery.toLowerCase();

      try {
        // Search posts by content, title, or tags
        const allPosts = await base44.entities.CommunityPost.filter({ status: "active" }, "-created_date", 50).catch(() => []);
        const filteredPosts = allPosts.filter((p) =>
          p.content?.toLowerCase().includes(lowerQuery) ||
          p.title?.toLowerCase().includes(lowerQuery) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
        setPosts(filteredPosts);

        // Search users by display_name or email
        const allUsers = await base44.entities.User.list("-created_date", 50).catch(() => []);
        const filteredUsers = allUsers.filter((u) =>
          u.full_name?.toLowerCase().includes(lowerQuery) ||
          u.email?.toLowerCase().includes(lowerQuery)
        );
        setUsers(filteredUsers);

        // Search hashtags by name
        const allHashtags = await base44.entities.Hashtag.list("-posts_count", 50).catch(() => []);
        const filteredHashtags = allHashtags.filter((h) =>
          h.name?.toLowerCase().includes(lowerQuery)
        );
        setHashtags(filteredHashtags);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Handle search input change
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleFollowChange = useCallback((targetEmail, isNowFollowing) => {
    setFollowedEmails((prev) => {
      const next = new Set(prev);
      if (isNowFollowing) next.add(targetEmail);
      else next.delete(targetEmail);
      return next;
    });
  }, []);

  const handleHashtagClick = (hashtag) => {
    navigate(`/Hashtag?tag=${encodeURIComponent(hashtag)}`);
  };

  const isEmpty = !query.trim();
  const hasResults = posts.length > 0 || users.length > 0 || hashtags.length > 0;

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca post, utenti, hashtag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-100 dark:bg-[#111] border-0 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs - only show if has results */}
          {hasResults && (
            <div className="flex gap-3 border-b border-gray-100 dark:border-[#2A2A2A] pb-3 -mx-4 px-4">
              <button
                onClick={() => setActiveTab("posts")}
                className={`flex items-center gap-1 text-xs font-semibold pb-2 border-b-2 transition-all ${
                  activeTab === "posts"
                    ? "border-[#2D6A4F] text-[#2D6A4F]"
                    : "border-transparent text-gray-400"
                }`}
              >
                <FileText className="w-3 h-3" />
                Post ({posts.length})
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-1 text-xs font-semibold pb-2 border-b-2 transition-all ${
                  activeTab === "users"
                    ? "border-[#2D6A4F] text-[#2D6A4F]"
                    : "border-transparent text-gray-400"
                }`}
              >
                <User className="w-3 h-3" />
                Utenti ({users.length})
              </button>
              <button
                onClick={() => setActiveTab("hashtags")}
                className={`flex items-center gap-1 text-xs font-semibold pb-2 border-b-2 transition-all ${
                  activeTab === "hashtags"
                    ? "border-[#2D6A4F] text-[#2D6A4F]"
                    : "border-transparent text-gray-400"
                }`}
              >
                <Hash className="w-3 h-3" />
                Hashtag ({hashtags.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
          </div>
        )}

        {isEmpty && !loading && (
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Hashtag di tendenza</p>
            <div className="flex flex-wrap gap-2">
              {trendingHashtags.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleHashtagClick(h.name)}
                  className="flex items-center gap-1 bg-gradient-to-r from-[#2D6A4F]/10 to-[#2D6A4F]/5 border border-[#2D6A4F]/20 rounded-full px-3 py-1.5 hover:border-[#2D6A4F]/40 transition"
                >
                  <Hash className="w-3 h-3 text-[#2D6A4F]" />
                  <span className="text-xs font-semibold text-[#2D6A4F]">{h.name}</span>
                  {h.posts_count > 0 && (
                    <span className="text-gray-500 text-[10px] ml-0.5">{h.posts_count}</span>
                  )}
                  {h.is_trending && <span className="text-[10px]">🔥</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && !isEmpty && !hasResults && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Nessun risultato per "{query}"
            </p>
            <p className="text-sm text-gray-400">Prova con una ricerca diversa</p>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === "posts" && !loading && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessun post trovato</p>
            ) : (
              posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  followedEmails={followedEmails}
                  onFollowChange={handleFollowChange}
                  onUpdate={() => {}}
                  onHashtagFilter={() => {}}
                />
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && !loading && (
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessun utente trovato</p>
            ) : (
              users.map((user) => (
                <Link
                  key={user.id}
                  to={`/ExpertProfile?uid=${btoa(user.email)}`}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-xl hover:bg-gray-50 dark:hover:bg-[#111] transition"
                >
                  {user.photo_url ? (
                    <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user.full_name || user.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-gray-500">{user.role === "admin" ? "👑 Admin" : user.is_expert ? "✅ Expert" : user.plan === "premium" ? "⭐ Premium" : "Membro"}</p>
                  </div>
                  {currentUser && currentUser.email !== user.email && (
                    <FollowButton
                      targetEmail={user.email}
                      currentUser={currentUser}
                      onFollowChange={(following) => handleFollowChange(user.email, following)}
                    />
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {/* Hashtags Tab */}
        {activeTab === "hashtags" && !loading && (
          <div className="space-y-2">
            {hashtags.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessun hashtag trovato</p>
            ) : (
              hashtags.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleHashtagClick(h.name)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-xl hover:bg-gray-50 dark:hover:bg-[#111] transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-5 h-5 text-[#2D6A4F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">#{h.name}</p>
                    <p className="text-xs text-gray-500">{h.posts_count} post{h.posts_count !== 1 ? "s" : ""}</p>
                  </div>
                  {h.is_trending && <span className="text-xl flex-shrink-0">🔥</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}