import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BadgeCheck, ArrowLeft, Loader2, Heart, MessageCircle, Lock, Grid3X3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import CommunityPostCard from "@/components/community/CommunityPostCard";

export default function ExpertProfile() {
  const [posts, setPosts] = useState([]);
  const [expert, setExpert] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("feed"); // feed | grid
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const expertEmail = params.get("id");

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setCurrentUser(u);

      if (!expertEmail) { setLoading(false); return; }

      const data = await base44.entities.CommunityPost.filter(
        { user_email: expertEmail, status: "active" },
        "-created_date",
        30
      );
      setPosts(data);

      // Use first post to build expert info
      if (data.length > 0) {
        setExpert({
          email: expertEmail,
          name: data[0].user_name || expertEmail.split("@")[0],
          photo: data[0].user_photo || null,
          is_expert: data[0].is_expert,
        });
      } else {
        setExpert({ email: expertEmail, name: expertEmail.split("@")[0], photo: null, is_expert: false });
      }

      setLoading(false);
    };
    init();
  }, [expertEmail]);

  const handlePostUpdate = (updated, originalId) => {
    if (updated === null) {
      setPosts((prev) => prev.filter((p) => p.id !== originalId));
    } else {
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const premiumCount = posts.filter((p) => p.is_premium).length;
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 dark:text-white text-lg truncate">
            {expert?.name}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Profile card */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-start gap-4">
            {expert?.photo ? (
              <img src={expert.photo} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[#2D6A4F]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center text-white font-bold text-2xl border-2 border-[#2D6A4F]">
                {(expert?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">{expert?.name}</h2>
                {expert?.is_expert && (
                  <BadgeCheck className="w-5 h-5 text-[#2D6A4F]" />
                )}
              </div>
              <p className="text-xs font-medium mb-3">
                {expert?.is_expert
                  ? <span className="text-[#2D6A4F]">✅ Expert</span>
                  : expertEmail === currentUser?.email
                    ? (currentUser?.plan === "premium"
                        ? <span className="text-purple-600">⭐ Premium</span>
                        : <span className="text-gray-400">Free</span>)
                    : <span className="text-gray-400">Membro</span>
                }
              </p>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="font-bold text-gray-900 dark:text-white text-base">{posts.length}</p>
                  <p className="text-xs text-gray-400">Post</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900 dark:text-white text-base">{totalLikes}</p>
                  <p className="text-xs text-gray-400">Like</p>
                </div>
                {premiumCount > 0 && (
                  <div className="text-center">
                    <p className="font-bold text-purple-600 text-base">{premiumCount}</p>
                    <p className="text-xs text-gray-400">Premium</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Premium banner for non-premium users when expert has premium content */}
          {premiumCount > 0 && !isPremiumUser && (
            <div className="mt-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  {premiumCount} contenut{premiumCount === 1 ? "o" : "i"} premium esclusiv{premiumCount === 1 ? "o" : "i"}
                </p>
                <p className="text-xs text-purple-500">Abbonati a Premium per accedere</p>
              </div>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex border-t border-gray-100 dark:border-[#2A2A2A]">
          <button
            onClick={() => setView("feed")}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              view === "feed"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-gray-400"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Feed
          </button>
          <button
            onClick={() => setView("grid")}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              view === "grid"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-gray-400"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            Griglia
          </button>
        </div>

        {/* Content */}
        {posts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-4xl mb-3">🍳</p>
            <p className="text-gray-400 text-sm">Nessun post ancora</p>
          </div>
        ) : view === "feed" ? (
          <div className="px-4 py-4 space-y-4 pb-24">
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
          <div className="grid grid-cols-3 gap-0.5 pb-24">
            {posts.map((post) => (
              <div key={post.id} className="relative aspect-square bg-gray-100 dark:bg-[#1A1A1A] overflow-hidden">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt=""
                    className={`w-full h-full object-cover ${post.is_premium && !isPremiumUser ? "blur-lg" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-[#1A1A1A]">
                    <p className="text-gray-300 text-xs text-center px-1 line-clamp-3">{post.content}</p>
                  </div>
                )}
                {post.is_premium && !isPremiumUser && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/40 rounded-full px-1.5 py-0.5">
                  <Heart className="w-2.5 h-2.5 text-white fill-white" />
                  <span className="text-white text-[9px] font-bold">{post.likes_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}