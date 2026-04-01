import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Hash, X, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TrendingHashtags({ onHashtagClick, currentUser }) {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState([]);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    base44.entities.Hashtag.filter({ is_trending: true }, "-posts_count", 10).then(setHashtags).catch(() => {
      // Fallback: get all by posts_count if is_trending filter fails
      base44.entities.Hashtag.list("-posts_count", 10).then(setHashtags).catch(() => {});
    });
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await base44.entities.Hashtag.delete(id);
    setHashtags((prev) => prev.filter((h) => h.id !== id));
  };

  const handleNavigate = (hashtag) => {
    navigate(`/Hashtag?tag=${encodeURIComponent(hashtag)}`);
  };

  if (hashtags.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
         <TrendingUp className="w-4 h-4 text-[#2D6A4F]" />
         <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hashtag in tendenza</p>
         {isAdmin && <span className="text-[10px] text-gray-400 ml-auto">admin: clicca la ✕ per eliminare</span>}
      </div>
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {hashtags.map((h) => (
          <button
            key={h.id}
            onClick={() => handleNavigate(h.name)}
            className="flex items-center gap-1 bg-gradient-to-r from-[#2D6A4F]/10 to-[#2D6A4F]/5 border border-[#2D6A4F]/20 rounded-full px-3 py-1.5 flex-shrink-0 hover:border-[#2D6A4F]/40 transition group relative"
          >
            <Hash className="w-3 h-3 text-[#2D6A4F]" />
            <span className="text-xs font-semibold text-[#2D6A4F]">{h.name}</span>
            {h.posts_count > 0 && (
              <span className="text-gray-500 text-[10px] ml-0.5">{h.posts_count}</span>
            )}
            {h.is_trending && <span className="text-[10px]">🔥</span>}
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(e, h.id);
                }}
                className="ml-1 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}
        {hashtags.length > 0 && (
          <div className="flex items-center gap-1 px-2 text-gray-400 flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}