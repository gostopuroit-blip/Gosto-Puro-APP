import { useMemo, useState } from "react";
import { fmtSeconds } from "./engagementUtils";

export default function AdminEngagementUsers({ events }) {
  const userMap = useMemo(() => {
    const map = {};

    events.forEach(e => {
      if (!e.user_email) return;
      const u = map[e.user_email] || {
        email: e.user_email,
        plan: e.user_plan || "free",
        sessions: 0,
        totalDuration: 0,
        recipeViews: 0,
        occasionClicks: 0,
        pwaInstallClick: false,
        pwaOpenedInstalled: false,
        lastSeen: null,
      };

      if (e.event_type === "session_start") {
        u.sessions += 1;
        if (!u.lastSeen || e.date > u.lastSeen) u.lastSeen = e.date;
      }
      if (e.event_type === "session_end" && e.session_duration_seconds > 0) {
        u.totalDuration += e.session_duration_seconds;
      }
      if (e.event_type === "recipe_view") u.recipeViews += 1;
      if (e.event_type === "occasion_click") u.occasionClicks += 1;
      if (e.event_type === "pwa_install_click") {
        if (e.occasion_label === "pwa_opened_installed") u.pwaOpenedInstalled = true;
        else if (e.occasion_label !== "banner_shown") u.pwaInstallClick = true;
      }

      map[e.user_email] = u;
    });

    return Object.values(map).sort((a, b) => b.sessions - a.sessions);
  }, [events]);

  if (!userMap.length) return (
    <p className="text-xs text-gray-400">Nenhum dado de usuário no período.</p>
  );

  return (
    <div className="space-y-2">
      {userMap.map(u => (
        <div key={u.email} className="bg-gray-50 rounded-xl p-3 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{u.email}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
              u.plan === "premium" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"
            }`}>
              {u.plan === "premium" ? "✨ Premium" : "Free"}
            </span>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <MiniStat label="Sessões" value={u.sessions} emoji="📅" />
            <MiniStat label="Tempo total" value={fmtSeconds(u.totalDuration)} emoji="⏱" />
            <MiniStat label="Receitas vistas" value={u.recipeViews} emoji="📖" />
            <MiniStat label="Ocasiões" value={u.occasionClicks} emoji="🏷" />
          </div>

          {/* PWA badges */}
          <div className="flex gap-2 flex-wrap">
            {u.pwaOpenedInstalled && (
              <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                📱 App instalado
              </span>
            )}
            {u.pwaInstallClick && (
              <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                🖱 Clicou instalar
              </span>
            )}
            {!u.pwaOpenedInstalled && !u.pwaInstallClick && (
              <span className="text-[10px] bg-gray-100 text-gray-400 font-semibold px-2 py-0.5 rounded-full">
                Não instalou
              </span>
            )}
            {u.lastSeen && (
              <span className="text-[10px] bg-blue-50 text-blue-500 font-semibold px-2 py-0.5 rounded-full ml-auto">
                último: {u.lastSeen}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, emoji }) {
  return (
    <div className="bg-white rounded-lg p-2 text-center">
      <p className="text-sm">{emoji}</p>
      <p className="text-xs font-bold text-gray-800">{value}</p>
      <p className="text-[9px] text-gray-400 leading-tight">{label}</p>
    </div>
  );
}