import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

async function computeWeeklyTop3() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const iso = startDate.toISOString();

  const [posts, comments, stories] = await Promise.all([
    base44.entities.CommunityPost.filter({ status: "active", created_date: { $gte: iso } }, "-created_date", 50).catch(() => []),
    base44.entities.CommunityComment.filter({ created_date: { $gte: iso } }, "-created_date", 50).catch(() => []),
    base44.entities.Story.filter({ created_date: { $gte: iso } }, "-created_date", 30).catch(() => []),
  ]);

  const scores = {};
  const ensure = (email, name, photo) => {
    if (!scores[email]) scores[email] = { email, name: name || email?.split("@")[0] || "?", photo: photo || null, points: 0 };
  };

  for (const p of posts) {
    if (!p.user_email) continue;
    ensure(p.user_email, p.user_name, p.user_photo);
    scores[p.user_email].points += 10 + (p.likes_count || 0) * 3 + (p.comments_count || 0) * 2;
  }
  for (const c of comments) {
    if (!c.user_email) continue;
    ensure(c.user_email, c.user_name, c.user_photo);
    scores[c.user_email].points += 1;
  }
  for (const s of stories) {
    if (!s.user_email) continue;
    ensure(s.user_email, s.user_name, s.user_photo);
    scores[s.user_email].points += 5;
  }

  return Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 3);
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function MiniRankingCard() {
  const [top3, setTop3] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Delay to avoid rate limit on initial page load
    const timer = setTimeout(() => {
      computeWeeklyTop3().then(setTop3).finally(() => setLoading(false));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!loading && top3.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Top 3 della settimana</h3>
        </div>
        <Link
          to="/CommunityRanking"
          className="text-xs text-[#2D6A4F] font-semibold hover:underline"
        >
          Vedi classifica →
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {top3.map((user, i) => (
            <div key={user.email} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center flex-shrink-0">{MEDAL[i]}</span>
              {user.photo ? (
                <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(user.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs font-bold text-[#2D6A4F] flex-shrink-0">{user.points} pt</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}