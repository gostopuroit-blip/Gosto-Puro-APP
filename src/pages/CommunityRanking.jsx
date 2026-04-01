import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PERIODS = [
  { key: "week", label: "Questa settimana" },
  { key: "month", label: "Questo mese" },
  { key: "all", label: "Di sempre" },
];

function getStartDate(period) {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

async function computeRanking(period) {
  const startDate = getStartDate(period);
  const dateFilter = startDate ? { $gte: startDate.toISOString() } : undefined;
  const postQuery = dateFilter ? { status: "active", created_date: dateFilter } : { status: "active" };
  const commentQuery = dateFilter ? { created_date: dateFilter } : {};
  const storyQuery = dateFilter ? { created_date: dateFilter } : {};

  const posts = await base44.entities.CommunityPost.filter(postQuery, "-created_date", 20).catch(() => []);
  const comments = await base44.entities.CommunityComment.filter(commentQuery, "-created_date", 20).catch(() => []);
  const stories = await base44.entities.Story.filter(storyQuery, "-created_date", 15).catch(() => []);

  const scores = {}; // email -> { points, name, photo, email }

  const ensureUser = (email, name, photo) => {
    if (!scores[email]) {
      scores[email] = { email, name: name || email?.split("@")[0] || "?", photo: photo || null, points: 0 };
    }
    if (name && !scores[email].name) scores[email].name = name;
    if (photo && !scores[email].photo) scores[email].photo = photo;
  };

  // +10 per post publicado, +3 per like recebida, +2 per comentário recebido
  for (const post of posts) {
    if (!post.user_email) continue;
    ensureUser(post.user_email, post.user_name, post.user_photo);
    scores[post.user_email].points += 10;
    scores[post.user_email].points += (post.likes_count || 0) * 3;
    scores[post.user_email].points += (post.comments_count || 0) * 2;
  }

  // +1 per comentário feito
  for (const comment of comments) {
    if (!comment.user_email) continue;
    ensureUser(comment.user_email, comment.user_name, comment.user_photo);
    scores[comment.user_email].points += 1;
  }

  // +5 per story publicado
  for (const story of stories) {
    if (!story.user_email) continue;
    ensureUser(story.user_email, story.user_name, story.user_photo);
    scores[story.user_email].points += 5;
  }

  return Object.values(scores)
    .sort((a, b) => b.points - a.points)
    .slice(0, 50);
}

function Avatar({ user, size = "md" }) {
  const sz = size === "lg" ? "w-16 h-16 text-2xl" : size === "md" ? "w-10 h-10 text-base" : "w-8 h-8 text-sm";
  return user.photo ? (
    <img src={user.photo} alt="" className={`${sz} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {(user.name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = [
  "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
  "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
];

export default function CommunityRanking() {
  const [period, setPeriod] = useState("week");
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    computeRanking(period)
      .then(setRanking)
      .finally(() => setLoading(false));
  }, [period]);

  const myRank = currentUser
    ? ranking.findIndex((r) => r.email === currentUser.email) + 1
    : 0;

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Link to={createPageUrl("Community")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="font-bold text-gray-900 dark:text-white text-lg">Classifica della Comunità</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Period filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                period === p.key
                  ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                  : "bg-white dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#333]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* My rank badge */}
        {currentUser && myRank > 0 && (
          <div className="bg-[#2D6A4F]/10 border border-[#2D6A4F]/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-[#2D6A4F]" />
            <p className="text-sm font-semibold text-[#2D6A4F]">
              Sei al <span className="text-lg font-bold">#{myRank}</span> posto!
            </p>
            <div className="ml-auto text-sm font-bold text-[#2D6A4F]">
              {ranking[myRank - 1]?.points} pt
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-semibold">Nessun dato per questo periodo</p>
          </div>
        ) : (
          <>
            {/* Top 3 */}
            <div className="space-y-3">
              {top3.map((user, i) => (
                <div
                  key={user.email}
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${MEDAL_BG[i]} ${
                    currentUser?.email === user.email ? "ring-2 ring-[#2D6A4F]" : ""
                  }`}
                >
                  <span className="text-3xl w-10 text-center flex-shrink-0">{MEDAL[i]}</span>
                  <Avatar user={user} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">#{i + 1} posto</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-extrabold text-[#2D6A4F]">{user.points}</p>
                    <p className="text-xs text-gray-400">punti</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Rest */}
            {rest.length > 0 && (
              <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden">
                {rest.map((user, i) => (
                  <div
                    key={user.email}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-[#2A2A2A] last:border-0 ${
                      currentUser?.email === user.email ? "bg-[#2D6A4F]/5" : ""
                    }`}
                  >
                    <span className="w-7 text-center text-sm font-bold text-gray-400 flex-shrink-0">#{i + 4}</span>
                    <Avatar user={user} size="sm" />
                    <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-sm font-bold text-[#2D6A4F] flex-shrink-0">{user.points} pt</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}