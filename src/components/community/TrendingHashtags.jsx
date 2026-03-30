import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Hash, X } from "lucide-react";

export default function TrendingHashtags({ onHashtagClick, currentUser }) {
  const [hashtags, setHashtags] = useState([]);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    base44.entities.Hashtag.list("-posts_count", 10).then(setHashtags).catch(() => {});
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await base44.entities.Hashtag.delete(id);
    setHashtags((prev) => prev.filter((h) => h.id !== id));
  };

  if (hashtags.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#2D6A4F]" />
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trending</p>
        {isAdmin && <span className="text-[10px] text-gray-400 ml-auto">admin: clique no ✕ para apagar</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {hashtags.map((h) => (
          <div key={h.id} className="relative flex items-center gap-1 bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-[#2A2A2A] rounded-full px-3 py-1">
            <button
              onClick={() => onHashtagClick?.(h.name)}
              className="flex items-center gap-1 text-xs font-medium text-[#2D6A4F]"
            >
              <Hash className="w-3 h-3" />
              {h.name}
              {h.posts_count > 0 && <span className="text-gray-400 text-[10px] ml-0.5">{h.posts_count}</span>}
              {h.is_trending && <span className="text-[10px]">🔥</span>}
            </button>
            {isAdmin && (
              <button onClick={(e) => handleDelete(e, h.id)} className="ml-1 text-gray-300 hover:text-red-500 transition">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}