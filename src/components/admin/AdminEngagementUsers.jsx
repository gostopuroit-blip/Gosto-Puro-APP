import { useMemo, useState } from "react";
import { fmtSeconds } from "./engagementUtils";

export default function AdminEngagementUsers({ events, allUsers = [] }) {
  const userMap = useMemo(() => {
    const map = {};

    // Seed all known users first (so even inactive ones appear)
    allUsers.forEach(u => {
      map[u.email] = {
        email: u.email,
        name: u.full_name || null,
        plan: u.plan || "free",
        sessions: 0,
        totalDuration: 0,
        recipeViews: 0,
        recipeSaved: 0,
        plannerCreated: 0,
        occasionClicks: 0,
        pwaInstallClick: false,
        pwaOpenedInstalled: false,
        lastSeen: null,
      };
    });

    // Merge analytics events
    events.forEach(e => {
      if (!e.user_email) return;
      if (!map[e.user_email]) {
        map[e.user_email] = {
          email: e.user_email,
          name: null,
          plan: e.user_plan || "free",
          sessions: 0,
          totalDuration: 0,
          recipeViews: 0,
          recipeSaved: 0,
          plannerCreated: 0,
          occasionClicks: 0,
          pwaInstallClick: false,
          pwaOpenedInstalled: false,
          lastSeen: null,
        };
      }
      const u = map[e.user_email];
      // Always update plan from latest event if available
      if (e.user_plan) u.plan = e.user_plan;

      if (e.event_type === "session_start") {
        u.sessions += 1;
        if (!u.lastSeen || e.date > u.lastSeen) u.lastSeen = e.date;
      }
      if (e.event_type === "session_end" && e.session_duration_seconds > 0) {
        u.totalDuration += e.session_duration_seconds;
      }
      if (e.event_type === "recipe_view") u.recipeViews += 1;
      if (e.event_type === "recipe_saved") u.recipeSaved += 1;
      if (e.event_type === "planner_created") u.plannerCreated += 1;
      if (e.event_type === "occasion_click") u.occasionClicks += 1;
      if (e.event_type === "pwa_install_click") {
        if (e.occasion_label === "pwa_opened_installed") u.pwaOpenedInstalled = true;
        else if (e.occasion_label !== "banner_shown") u.pwaInstallClick = true;
      }
    });

    // Sort: active users first (by sessions desc), then inactive
    return Object.values(map).sort((a, b) => b.sessions - a.sessions);
  }, [events, allUsers]);

  const [search, setSearch] = useState("");

  if (!userMap.length) return (
    <p className="text-xs text-gray-400">Nenhum dado de usuário no período.</p>
  );

  const filtered = search.trim()
    ? userMap.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : userMap;

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Buscar por e-mail..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 mb-1 outline-none"
      />
      <p className="text-[10px] text-gray-400 mb-1">{filtered.length} usuário{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
      {filtered.map(u => (
        <div key={u.email} className="bg-gray-50 rounded-xl p-3 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {u.name && <p className="text-[10px] text-gray-400">{u.name}</p>}
              <p className="text-xs font-bold text-gray-800 truncate">{u.email}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                u.plan === "premium" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"
              }`}>
                {u.plan === "premium" ? "✨ Premium" : "Free"}
              </span>
              {u.sessions === 0 && (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-400">
                  Inativo no período
                </span>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-1.5">
            <MiniStat label="Sessões" value={u.sessions} emoji="📅" />
            <MiniStat label="Tempo total" value={fmtSeconds(u.totalDuration)} emoji="⏱" />
            <MiniStat label="Vistas" value={u.recipeViews} emoji="📖" />
            <MiniStat label="Salvas" value={u.recipeSaved} emoji="❤️" />
            <MiniStat label="Ocasiões" value={u.occasionClicks} emoji="🏷" />
            <MiniStat label="Planner" value={u.plannerCreated} emoji="📅" />
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