import { useMemo, useState } from "react";
import { fmtSeconds } from "./engagementUtils";

const W_VIEWS = 1;
const W_SAVED = 3;
const W_PLANNER = 5;
const W_SESSION = 0.5;

function buildRanking(events, allUsers, limit = 50) {
  const map = {};

  allUsers.forEach(u => {
    if (u.email) {
      map[u.email] = {
        email: u.email,
        name: u.full_name || null,
        plan: u.plan || "free",
        _planFromUsers: true, // plano vem do cadastro atual
        views: 0, saved: 0, planner: 0, sessions: 0, totalDuration: 0,
        _sessionIds: new Set(),
        _durationSessions: new Set(),
      };
    }
  });

  events.forEach(e => {
    if (!e.user_email) return;
    if (!map[e.user_email]) {
      map[e.user_email] = {
        email: e.user_email, name: null, plan: e.user_plan || "free",
        _planFromUsers: false,
        views: 0, saved: 0, planner: 0, sessions: 0, totalDuration: 0,
        _sessionIds: new Set(),
        _durationSessions: new Set(),
      };
    }
    const u = map[e.user_email];
    if (e.event_type === "recipe_view") u.views++;
    if (e.event_type === "recipe_saved") u.saved++;
    if (e.event_type === "planner_created") u.planner++;
    if (e.event_type === "session_start") {
      u._sessionIds.add(e.session_id || e.id || Math.random());
      u.sessions = u._sessionIds.size;
    }
    if (e.event_type === "session_end" && e.session_duration_seconds > 0) {
      const key = e.session_id || e.id;
      if (key && !u._durationSessions.has(key)) {
        u._durationSessions.add(key);
        u.totalDuration += e.session_duration_seconds;
      }
    }
    // Só atualiza o plano pelo evento se o usuário não veio do cadastro atual
    if (e.user_plan && !u._planFromUsers) u.plan = e.user_plan;
  });

  return Object.values(map)
    .map(u => ({
      email: u.email,
      name: u.name,
      plan: u.plan,
      views: u.views,
      saved: u.saved,
      planner: u.planner,
      sessions: u.sessions,
      totalDuration: u.totalDuration,
      score: Math.round(u.views * W_VIEWS + u.saved * W_SAVED + u.planner * W_PLANNER + u.sessions * W_SESSION),
    }))
    .filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export default function AdminTopUsers({ events, allUsers, allTimeEvents, showingAllTime }) {
  const [tab, setTab] = useState("period");

  const periodRanking = useMemo(() => buildRanking(events, allUsers, 50), [events, allUsers]);
  const allTimeRanking = useMemo(() => buildRanking(allTimeEvents || [], allUsers, 50), [allTimeEvents, allUsers]);

  const activeRanking = (tab === "alltime" || showingAllTime) ? allTimeRanking : periodRanking;

  if (!activeRanking.length && !periodRanking.length && !allTimeRanking.length) {
    return <p className="text-xs text-gray-400">Sem dados suficientes ainda.</p>;
  }

  const maxScore = activeRanking[0]?.score || 1;

  return (
    <div className="space-y-3">
      {!showingAllTime && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("period")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${tab === "period" ? "bg-white text-[#2D6A4F] shadow-sm" : "text-gray-500"}`}
          >
            Período
          </button>
          <button
            onClick={() => setTab("alltime")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${tab === "alltime" ? "bg-white text-[#2D6A4F] shadow-sm" : "text-gray-500"}`}
          >
            ∞ Histórico
          </button>
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        Score = views×1 + saves×3 + planners×5 + sessões×0.5
        {(tab === "alltime" || showingAllTime) ? " · total acumulado (nunca perde pontos)" : " · período selecionado"}
      </p>

      {activeRanking.length === 0 ? (
        <p className="text-xs text-gray-400">Sem dados no período.</p>
      ) : (
        activeRanking.map((u, i) => (
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
              <div className="flex gap-2 text-[9px] text-gray-400 flex-wrap">
                <span>📖 {u.views} views</span>
                <span>❤️ {u.saved} saves</span>
                <span>📅 {u.planner} planners</span>
                <span>🔑 {u.sessions} sessões</span>
                <span>⏱ {fmtSeconds(u.totalDuration)}</span>
              </div>
            </div>
            <span className="text-sm font-bold text-[#2D6A4F] flex-shrink-0">{u.score}</span>
          </div>
        ))
      )}
    </div>
  );
}