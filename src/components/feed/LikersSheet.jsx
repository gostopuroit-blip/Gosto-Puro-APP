import { useState, useEffect } from "react";
import { X, Heart, Loader2, BadgeCheck } from "lucide-react";
import { Avatar } from "./CommentsSheet";
import { fetchPostLikers } from "@/api/feed";

// Lista de quem curtiu um post (estilo Instagram "Mi piace").
export default function LikersSheet({ postId, count, onClose }) {
  const [likers, setLikers] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPostLikers(postId).then((l) => { if (alive) setLikers(l); }).catch(() => { if (alive) setLikers([]); });
    return () => { alive = false; };
  }, [postId]);

  return (
    <div className="fixed inset-0 z-[72] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[75vh]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#333]">
          <span className="w-6" />
          <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <Heart className="w-4 h-4 fill-red-500 text-red-500" /> Mi piace
          </p>
          <button onClick={onClose} className="text-gray-400"><X className="w-6 h-6" /></button>
        </div>

        <div className="overflow-y-auto p-2">
          {likers === null ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" /></div>
          ) : likers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              {count > 0 ? "Non è possibile mostrare chi ha messo mi piace." : "Ancora nessun mi piace."}
            </p>
          ) : (
            likers.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 px-2.5 py-2">
                <Avatar name={u.display_name} photo={u.photo_url} size={40} />
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {u.display_name || "Utente"}
                  </span>
                  {(u.role === "admin" || u.role === "premium") && (
                    <BadgeCheck className={`w-4 h-4 flex-shrink-0 ${u.role === "admin" ? "text-[#D4A846]" : "text-[#2D6A4F]"}`} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
