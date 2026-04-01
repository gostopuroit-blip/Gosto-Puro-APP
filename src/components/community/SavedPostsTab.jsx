import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import PostDetailModal from "./PostDetailModal";

export default function SavedPostsTab({ currentUser }) {
  const [savedGroups, setSavedGroups] = useState({});
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCollection, setExpandedCollection] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    loadSavedPosts();
  }, [currentUser?.email]);

  const loadSavedPosts = async () => {
    try {
      setLoading(true);
      const saved = await base44.entities.SavedPost.filter(
        { user_email: currentUser.email },
        "-created_date",
        500
      );

      if (saved.length === 0) {
        setSavedGroups({});
        setCollections([]);
        setLoading(false);
        return;
      }

      // Fetch full post for each saved item sequentially to avoid rate limits
      const items = [];
      for (const s of saved) {
        try {
          // Use the built-in id field to fetch a single post
          const post = await base44.entities.CommunityPost.get(s.post_id).catch(() => null);
          items.push({
            savedId: s.id,
            collection: s.collection || "Salvati",
            post: post || null,
            post_id: s.post_id,
          });
        } catch {
          items.push({ savedId: s.id, collection: s.collection || "Salvati", post: null, post_id: s.post_id });
        }
      }

      // Group by collection, filter out items with no post found
      const groups = {};
      items.forEach((item) => {
        if (!item.post) return;
        const col = item.collection;
        if (!groups[col]) groups[col] = [];
        groups[col].push(item);
      });

      const uniqueCollections = Object.keys(groups).sort();
      setCollections(uniqueCollections);
      setSavedGroups(groups);
      if (uniqueCollections.length > 0) setExpandedCollection(uniqueCollections[0]);
    } catch (err) {
      setSavedGroups({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-4xl mb-3">🔖</p>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Nessun post salvato</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Salva i post che ti piacciono per trovarli qui
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {collections.map((collection) => {
          const posts = savedGroups[collection] || [];
          const isExpanded = expandedCollection === collection;

          return (
            <div key={collection} className="space-y-3">
              <button
                onClick={() => setExpandedCollection(isExpanded ? null : collection)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] hover:border-[#2D6A4F] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📁</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">{collection}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{posts.length} post</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-2 gap-3 pl-2">
                  {posts.map((item) => (
                    <div
                      key={item.savedId}
                      onClick={() => setSelectedPost(item.post)}
                      className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#111] aspect-square cursor-pointer hover:opacity-80 transition"
                    >
                      {(item.post.images?.length > 0 || item.post.image_url) ? (
                        <img
                          src={item.post.images?.[0] || item.post.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : item.post.video_url ? (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <span className="text-2xl">🎥</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3">
                          <p className="text-gray-500 text-xs text-center line-clamp-4">{item.post.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onUpdate={() => {}}
        />
      )}
    </>
  );
}