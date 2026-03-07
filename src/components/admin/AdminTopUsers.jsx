import { useMemo } from "react";
import { fmtSeconds } from "./engagementUtils";

// Weights for engagement score
const W_VIEWS = 1;
const W_SAVED = 3;
const W_PLANNER = 5;
const W_SESSION = 0.5;

export default function AdminTopUsers({ events, allUsers }) {
  const topUsers = useMemo(() => {
    const map = {};

    // Seed from all users
    allUsers.forEach(u => {
      if (u.email) {
        map[u.email] = {
          email: u.email,
          name: u.full_name || null,
          plan: u.plan || "free",
          views: 0,
          saved: 0,
          planner: 0,
          sessions: 0,
          totalDuration: 0,
        };
      }
    });

    events.forEach(e => {
      if (!e.user_email) return;
      if (!map[e.user_email]) {
        map[e.user_email] = { email: e.user_email, name: null, plan: e.user_plan || "free", views: 0, saved: 0, planner: 0, sessions: 0, totalDuration: 0 };
      }
      const u = map[e.user_email];
      if (e.event_type === "recipe_view") u.views++;
      if (e.event_type === "recipe_saved") u.saved++;
      if (e.event_type === "planner_created") u.planner++;
      if (e.event_type === "session_start") u.sessions++;
      if (e.event_type === "session_end" && e.session_duration_seconds > 0) u.totalDuration += e.session_duration_seconds;
      if (e.user_plan) u.plan = e.user_plan;
    });

    return Object.values(map)
      .map(u => ({
        ...u,
        score: Math.round(u.views * W_VIEWS + u.saved * W_SAVED + u.planner * W_PLANNER + u.sessions * W_SESSION),
      }))
      .filter(u => u.score > 0 && u.role !== "admin")
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [events, allUsers]);

  if (!topUsers.length) {
    return <p className="text-xs text-gray-400">Sem dados suficientes ainda.</p>;
  }

  const maxScore = topUsers[0].score;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-400">Score = views×1 + saves×3 + planners×5 + sessões×0.5</p>
      {topUsers.map((u, i) => (
        <div key={u.email} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <span className={`text-sm font-bold w-5 flex-shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}>
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold text-gray-800 truncate">{u.name || u.email}</p>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${u.plan === "premium" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"}`}>
                {u.plan === "premium" ? "✨" : "Free"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
              <div className="bg-[#2D6A4F] h-1.5 rounded-full" style={{ width: `${Math.max(4, Math.round((u.score / maxScore) * 100))}%` }} />
            </div>
            <div className="flex gap-2 text-[9px] text-gray-400">
              <span>📖 {u.views}</span>
              <span>❤️ {u.saved}</span>
              <span>📅 {u.planner}</span>
              <span>⏱ {fmtSeconds(u.totalDuration)}</span>
            </div>
          </div>
          <span className="text-sm font-bold text-[#2D6A4F] flex-shrink-0">{u.score}</span>
        </div>
      ))}
    </div>
  );
}