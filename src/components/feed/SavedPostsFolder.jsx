import { useState, useEffect } from "react";
import { Bookmark, ChevronDown, Film, Loader2, X } from "lucide-react";
import { fetchSavedPosts } from "@/api/feed";
import PostCard from "./PostCard";

// Pasta única "Feed Gosto Puro" dentro de Cartelle: grade de capas dos posts
// salvos (estilo perfil do Instagram). Tocar abre o post completo num modal.
export default function SavedPostsFolder({ user }) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  const load = () => {
    setLoading(true);
    fetchSavedPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const closeModal = () => { setActive(null); load(); }; // recarrega p/ refletir "remover salvo"
  const cover = (p) => (Array.isArray(p.media) ? p.media[0] : null);

  return (
    <div className="bg-white dark:bg-[#2D3F35] border border-gray-100 dark:border-[#3D5246] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#1A2B20] transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2D6A4F]/10 flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-[#2D6A4F]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">Feed Gosto Puro</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {loading ? "..." : `${posts.length} post salvati`}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-[#3D5246] pt-3">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" /></div>
          ) : posts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">
              Nessun post salvato. Tocca il segnalibro su un post del feed.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {posts.map((p) => {
                const c = cover(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-[#1A2B20]"
                  >
                    {c?.type === "video" ? (
                      c.poster ? (
                        <img src={c.poster} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black">
                          <Film className="w-6 h-6 text-white/70" />
                        </div>
                      )
                    ) : (
                      <img src={c?.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {Array.isArray(p.media) && p.media.length > 1 && (
                      <span className="absolute top-1 right-1 bg-black/55 text-white text-[9px] font-bold px-1 rounded">
                        {p.media.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <PostCard post={active} me={user} onDeleted={closeModal} />
          </div>
        </div>
      )}
    </div>
  );
}
