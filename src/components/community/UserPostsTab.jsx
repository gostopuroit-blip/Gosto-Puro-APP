import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock } from "lucide-react";
import CommunityPostCard from "./CommunityPostCard";
import PostDetailModal from "./PostDetailModal";

export default function UserPostsTab({ userEmail, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("feed"); // feed | grid
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    loadPosts();
  }, [userEmail]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.CommunityPost.filter(
        { user_email: userEmail, status: "active" },
        "-created_date",
        100
      );
      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = (updated, originalId) => {
    if (updated === null) {
      setPosts((prev) => prev.filter((p) => p.id !== originalId));
    } else {
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🍳</p>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Nessun post ancora</p>
      </div>
    );
  }

  return (
    <>
      {/* View toggle */}
      <div className="flex gap-4 border-b border-gray-100 dark:border-[#2A2A2A] px-4 -mx-4 mb-4">
        <button
          onClick={() => setViewMode("feed")}
          className={`py-3 px-2 text-xs font-semibold border-b-2 transition ${
            viewMode === "feed"
              ? "border-[#2D6A4F] text-[#2D6A4F]"
              : "border-transparent text-gray-400"
          }`}
        >
          Feed
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className={`py-3 px-2 text-xs font-semibold border-b-2 transition ${
            viewMode === "grid"
              ? "border-[#2D6A4F] text-[#2D6A4F]"
              : "border-transparent text-gray-400"
          }`}
        >
          Galleria
        </button>
      </div>

      {/* Feed view */}
      {viewMode === "feed" ? (
        <div className="space-y-4">
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
        <div className="grid grid-cols-2 gap-2 -mx-4 px-4">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="relative aspect-square bg-gray-100 dark:bg-[#111] rounded-lg overflow-hidden hover:opacity-80 transition group"
            >
              {post.image_url ? (
                <img
                  src={post.image_url}
                  alt=""
                  className={`w-full h-full object-cover ${
                    post.is_premium && !isPremiumUser ? "blur-lg" : ""
                  }`}
                />
              ) : post.video_url ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <span className="text-2xl">🎥</span>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-[#1A1A1A]">
                  <p className="text-gray-400 text-xs text-center px-2 line-clamp-2">
                    {post.content}
                  </p>
                </div>
              )}
              {post.is_premium && !isPremiumUser && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Lock className="w-5 h-5 text-white" />
                </div>
              )}
              {/* Hover overlay with stats */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/40 flex items-center justify-center">
                <div className="flex gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <span>❤️</span>
                    <span className="text-sm font-semibold">{post.likes_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>💬</span>
                    <span className="text-sm font-semibold">{post.comments_count || 0}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onUpdate={(updated) => handlePostUpdate(updated, selectedPost.id)}
        />
      )}
    </>
  );
}