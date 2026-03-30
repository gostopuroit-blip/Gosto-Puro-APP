import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Loader2, Trash2, Pin, Users2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminCommunity() {
  const [metrics, setMetrics] = useState(null);
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [pinnedPost, setPinnedPost] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingMetrics(true);
    setLoadingPosts(true);
    setLoadingUsers(true);

    try {
      // Load metrics
      const [postsData, commentsData, usersData] = await Promise.all([
        base44.entities.CommunityPost.list("-created_date", 500),
        base44.entities.CommunityComment.list("-created_date", 500),
        base44.entities.User.list("-created_date", 500),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const postsToday = postsData.filter((p) => p.created_date.startsWith(today)).length;
      const newUsersToday = usersData.filter((u) => u.created_date.startsWith(today)).length;

      const reactionsData = await base44.entities.PostReaction.list("-created_date", 500).catch(() => []);
      const reactionsToday = reactionsData.filter((r) => r.created_date.startsWith(today)).length;

      // Posts per day (last 7 days)
      const postsPerDay = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        const count = postsData.filter((p) => p.created_date.startsWith(dateStr)).length;
        postsPerDay[dateStr] = count;
      }

      const chartData = Object.entries(postsPerDay).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { weekday: "short" }),
        posts: count,
      }));

      setMetrics({
        totalPosts: postsData.length,
        totalComments: commentsData.length,
        totalUsers: usersData.length,
        newUsersToday,
        postsToday,
        reactionsToday,
        chartData,
      });

      // Load posts for pinning
      setPosts(postsData);
      const pinned = postsData.find((p) => p.is_pinned);
      setPinnedPost(pinned || null);

      // Load suggested users
      const suggested = usersData.filter((u) => u.is_suggested);
      setSuggestedUsers(suggested);
      setAllUsers(usersData);
    } catch (error) {
      console.error("Error loading community data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoadingMetrics(false);
      setLoadingPosts(false);
      setLoadingUsers(false);
    }
  };

  const handlePinPost = async (post) => {
    try {
      // Unpin previous if exists
      if (pinnedPost && pinnedPost.id !== post.id) {
        await base44.entities.CommunityPost.update(pinnedPost.id, { is_pinned: false });
      }

      // Pin new post
      await base44.entities.CommunityPost.update(post.id, { is_pinned: true });
      setPinnedPost(post);
      setPosts(posts.map((p) => ({ ...p, is_pinned: p.id === post.id })));
      toast.success("Post fixado no topo!");
    } catch (error) {
      toast.error("Erro ao fixar post");
    }
  };

  const handleUnpinPost = async (post) => {
    try {
      await base44.entities.CommunityPost.update(post.id, { is_pinned: false });
      setPinnedPost(null);
      setPosts(posts.map((p) => ({ ...p, is_pinned: false })));
      toast.success("Post desafixado");
    } catch (error) {
      toast.error("Erro ao desafixar post");
    }
  };

  const handleToggleSuggest = async (user, isSuggested) => {
    try {
      await base44.entities.User.update(user.id, { is_suggested: !isSuggested });
      const updated = { ...user, is_suggested: !isSuggested };
      setAllUsers(allUsers.map((u) => (u.id === user.id ? updated : u)));
      setSuggestedUsers(isSuggested ? suggestedUsers.filter((u) => u.id !== user.id) : [...suggestedUsers, updated]);
      toast.success(isSuggested ? "Removido de sugestões" : "Adicionado a sugestões");
    } catch (error) {
      toast.error("Erro ao atualizar sugestão");
    }
  };

  if (loadingMetrics) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Métricas da Comunidade</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-semibold">Total Posts</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{metrics?.totalPosts || 0}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-green-600 font-semibold">Total Comentários</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{metrics?.totalComments || 0}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs text-purple-600 font-semibold">Total Usuários</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{metrics?.totalUsers || 0}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-orange-600 font-semibold">Novos Usuários (Hoje)</p>
            <p className="text-2xl font-bold text-orange-900 mt-1">{metrics?.newUsersToday || 0}</p>
          </div>
          <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
            <p className="text-xs text-pink-600 font-semibold">Posts (Hoje)</p>
            <p className="text-2xl font-bold text-pink-900 mt-1">{metrics?.postsToday || 0}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-600 font-semibold">Reações (Hoje)</p>
            <p className="text-2xl font-bold text-red-900 mt-1">{metrics?.reactionsToday || 0}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {metrics?.chartData && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Posts nos Últimos 7 Dias</h3>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                <Bar dataKey="posts" fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pin Post Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Fixar Post no Topo</h2>
        {pinnedPost && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Pin className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">📌 Post Fixado</p>
                <p className="text-sm text-amber-700 mt-1">
                  {pinnedPost.title || pinnedPost.content?.slice(0, 50)}...
                </p>
              </div>
            </div>
            <button
              onClick={() => handleUnpinPost(pinnedPost)}
              className="text-xs bg-amber-600 text-white px-2.5 py-1 rounded-lg hover:bg-amber-700 transition flex-shrink-0"
            >
              Desafixar
            </button>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum post disponível</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {posts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-gray-50 transition flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {post.title || post.content?.slice(0, 50)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Por {post.user_name} · {formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {post.is_pinned ? (
                    <button
                      onClick={() => handleUnpinPost(post)}
                      className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-200 transition flex-shrink-0 font-semibold"
                    >
                      📌 Fixado
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePinPost(post)}
                      className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-300 transition flex-shrink-0 font-semibold"
                    >
                      Fixar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested Users Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Usuários Sugeridos para Seguir</h2>
        <p className="text-sm text-gray-600 mb-4">
          {suggestedUsers.length} usuário{suggestedUsers.length !== 1 ? "s" : ""} marcado{suggestedUsers.length !== 1 ? "s" : ""} como sugerido
        </p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          ) : allUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum usuário disponível</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {allUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {user.photo_url ? (
                      <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-purple-700">
                        {(user.display_name || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {user.display_name || user.email?.split("@")[0]}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSuggest(user, user.is_suggested)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex-shrink-0 ${
                      user.is_suggested
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {user.is_suggested ? "✓ Sugerido" : "Sugerir"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}