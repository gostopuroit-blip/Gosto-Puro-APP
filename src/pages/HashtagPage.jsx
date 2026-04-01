import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Flame, Loader2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import PostDetailModal from "@/components/community/PostDetailModal";

export default function HashtagPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const hashtag = queryParams.get("tag") || "";

  const [hashtag_data, setHashtagData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setCurrentUser(u);

      if (!hashtag) {
        setLoading(false);
        return;
      }

      const [hashtagData, postsData] = await Promise.all([
        base44.entities.Hashtag.filter({ name: hashtag }, "-created_date", 1).catch(() => []),
        base44.entities.CommunityPost.filter({ status: "active" }, "-created_date", 100).catch(() => []),
      ]);

      setHashtagData(hashtagData[0] || null);
      // Filter posts that contain this hashtag
      const filtered = postsData.filter((p) => p.tags?.includes(hashtag));
      setPosts(filtered);
      setLoading(false);
    };
    init();
  }, [hashtag]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  if (!hashtag) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/Community" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-gray-900 dark:text-white text-lg">Hashtag non trovata</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-4">
          <Link to="/Community" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 dark:text-white text-lg">#{hashtag}</h1>
            <p className="text-xs text-gray-400">
              {posts.length} post{posts.length !== 1 ? "s" : ""} {hashtag_data?.is_trending && (
                <span className="flex items-center gap-1 inline-flex ml-2 text-orange-500 font-semibold">
                  <Flame className="w-3 h-3" /> Di tendenza
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Nessun post con #{hashtag}
            </p>
            <p className="text-sm text-gray-400">Sii il primo a usare questo hashtag!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2A2A2A] hover:opacity-80 transition relative group"
              >
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <p className="text-white font-semibold text-sm">
                    ❤️ {post.likes_count || 0}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}