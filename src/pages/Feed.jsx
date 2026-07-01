import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { fetchFeed } from "@/api/feed";
import PostCard from "@/components/feed/PostCard";
import ComposeSheet from "@/components/feed/ComposeSheet";
import StoriesBar from "@/components/feed/StoriesBar";
import { Plus, Loader2, Sparkles } from "lucide-react";

export default function Feed() {
  const [me, setMe] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [compose, setCompose] = useState(false);

  const isPublisher = me?.role === "admin" || me?.is_expert === true;

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => setMe(null));
  }, []);

  const load = useCallback(async (p) => {
    const { posts: batch, hasMore: more } = await fetchFeed({ page: p });
    setHasMore(more);
    setPosts((prev) => (p === 0 ? batch : [...prev, ...batch]));
  }, []);

  useEffect(() => {
    load(0).catch(() => {}).finally(() => setLoading(false));
  }, [load]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      await load(next);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const onDeleted = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));
  const onPublished = (post) => {
    setPosts((prev) => [post, ...prev]);
    setCompose(false);
  };

  return (
    <div className="min-h-[60vh] pb-4">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-[#2D6A4F]" /> Feed
        </h1>
      </div>

      {/* Stories 24h */}
      <StoriesBar me={me} />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-8 py-20">
          <div className="w-16 h-16 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-[#2D6A4F]" />
          </div>
          <p className="font-bold text-gray-800 dark:text-gray-100">Ancora nessun post</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            {isPublisher
              ? "Pubblica il primo contenuto con il pulsante +"
              : "Presto troverai qui ricette, consigli e video dal team Gosto Puro."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:px-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} me={me} onDeleted={onDeleted} />
          ))}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm font-semibold text-[#2D6A4F] flex items-center gap-2"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Carica altro
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botão flutuante — só publisher */}
      {isPublisher && (
        <button
          onClick={() => setCompose(true)}
          className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-[#2D6A4F] text-white shadow-lg flex items-center justify-center active:scale-90 transition"
          aria-label="Nuovo post"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {compose && <ComposeSheet me={me} onClose={() => setCompose(false)} onPublished={onPublished} />}
    </div>
  );
}
