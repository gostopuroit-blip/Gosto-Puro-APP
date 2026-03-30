import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import CommunityPostCard from "./CommunityPostCard";

export default function SavedPostsTab({ currentUser }) {
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collections, setCollections] = useState([]);
  const [expandedCollection, setExpandedCollection] = useState(null);

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

      // Get unique collections
      const uniqueCollections = [...new Set(saved.map((s) => s.collection || "Salvati"))].sort();
      setCollections(uniqueCollections);
      if (uniqueCollections.length > 0 && !selectedCollection) {
        setSelectedCollection(uniqueCollections[0]);
        setExpandedCollection(uniqueCollections[0]);
      }

      // Fetch full post details for each saved post
      const postsData = await Promise.all(
        saved.map((s) =>
          base44.entities.CommunityPost.filter({ id: s.post_id }, "-created_date", 1).then((posts) => ({
            savedId: s.id,
            collection: s.collection || "Salvati",
            post: posts[0],
          }))
        )
      );

      setSavedPosts(postsData.filter((p) => p.post));
    } catch (err) {
      setSavedPosts([]);
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

  const groupedByCollection = {};
  savedPosts.forEach((item) => {
    const col = item.collection;
    if (!groupedByCollection[col]) groupedByCollection[col] = [];
    groupedByCollection[col].push(item);
  });

  if (Object.keys(groupedByCollection).length === 0) {
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
    <div className="space-y-4">
      {collections.map((collection) => {
        const posts = groupedByCollection[collection] || [];
        const isExpanded = expandedCollection === collection;

        return (
          <div key={collection} className="space-y-3">
            {/* Collection header */}
            <button
              onClick={() =>
                setExpandedCollection(isExpanded ? null : collection)
              }
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] hover:border-[#2D6A4F] transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📁</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {collection}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {posts.length} post
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Posts grid */}
            {isExpanded && (
              <div className="grid grid-cols-2 gap-3 pl-2">
                {posts.map((item) => (
                  <div key={item.post.id} className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#111] aspect-square cursor-pointer hover:opacity-80 transition group">
                    {item.post.image_url ? (
                      <img
                        src={item.post.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : item.post.video_url ? (
                      <div className="w-full h-full bg-black flex items-center justify-center">
                        <span className="text-2xl">🎥</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">📝</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <p className="text-white text-sm font-semibold">Visualizza</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}