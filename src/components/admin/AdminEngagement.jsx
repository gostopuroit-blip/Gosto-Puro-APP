import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Users, BookOpen, Smartphone, Clock, TrendingUp } from "lucide-react";
import { fmtSeconds } from "./engagementUtils";
import AdminEngagementUsers from "./AdminEngagementUsers";

const DAYS_OPTIONS = [7, 14, 30];

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

export default function AdminEngagement() {
  const [days, setDays] = useState(7);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [days]);

  const load = async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // Load all analytics events in the period
    let all = [];
    let skip = 0;
    while (true) {
      const batch = await base44.entities.AppAnalytics.list("-created_date", 200, skip);
      const filtered = batch.filter(e => e.date >= cutoffStr);
      all = all.concat(filtered);
      if (batch.length < 200 || filtered.length < batch.length) break;
      skip += 200;
    }
    setEvents(all);
    setLoading(false);
  };

  // --- Derived metrics ---
  const sessionStarts = events.filter(e => e.event_type === "session_start");
  const sessionEnds = events.filter(e => e.event_type === "session_end" && e.session_duration_seconds > 0);
  const recipeViews = events.filter(e => e.event_type === "recipe_view");
  const occasionClicks = events.filter(e => e.event_type === "occasion_click");
  const pwaClicks = events.filter(e => e.event_type === "pwa_install_click");

  // Unique returning users (more than 1 session)
  const sessionsByUser = {};
  sessionStarts.forEach(e => {
    if (e.user_email) {
      sessionsByUser[e.user_email] = (sessionsByUser[e.user_email] || 0) + 1;
    }
  });
  const returningUsers = Object.values(sessionsByUser).filter(c => c > 1).length;
  const uniqueUsers = Object.keys(sessionsByUser).length;

  // Free vs Premium returning
  const returningFree = sessionStarts.filter(e => e.user_plan === "free" && e.user_email && (sessionsByUser[e.user_email] || 0) > 1);
  const returningPremium = sessionStarts.filter(e => e.user_plan === "premium" && e.user_email && (sessionsByUser[e.user_email] || 0) > 1);
  const returningFreeUniq = new Set(returningFree.map(e => e.user_email)).size;
  const returningPremiumUniq = new Set(returningPremium.map(e => e.user_email)).size;

  // Unique users who viewed recipes
  const usersViewedRecipes = new Set(recipeViews.filter(e => e.user_email).map(e => e.user_email)).size;

  // Top recipes
  const recipeCounts = {};
  recipeViews.forEach(e => {
    if (e.recipe_title) recipeCounts[e.recipe_title] = (recipeCounts[e.recipe_title] || 0) + 1;
  });
  const topRecipes = Object.entries(recipeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top occasions
  const occasionCounts = {};
  occasionClicks.forEach(e => {
    if (e.occasion_label) occasionCounts[e.occasion_label] = (occasionCounts[e.occasion_label] || 0) + 1;
  });
  const topOccasions = Object.entries(occasionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Avg session duration (per sessione)
  const durations = sessionEnds.map(e => e.session_duration_seconds).filter(Boolean);
  const avgDuration = avg(durations);

  // Avg time per user (soma das sessões de cada usuário, depois média entre usuários)
  const durationByUser = {};
  sessionEnds.forEach(e => {
    if (e.user_email && e.session_duration_seconds > 0) {
      durationByUser[e.user_email] = (durationByUser[e.user_email] || 0) + e.session_duration_seconds;
    }
  });
  const userTotals = Object.values(durationByUser);
  const avgDurationPerUser = avg(userTotals);

  // PWA — separate banner impressions from real install clicks
  const pwaBannerShown = pwaClicks.filter(e => e.occasion_label === "banner_shown");
  const pwaOpenedInstalled = pwaClicks.filter(e => e.occasion_label === "pwa_opened_installed");
  const pwaRealClicks = pwaClicks.filter(e => e.occasion_label !== "banner_shown" && e.occasion_label !== "pwa_opened_installed");
  const pwaTotal = pwaRealClicks.length;
  const pwaBannerTotal = pwaBannerShown.length;
  const pwaUniqueUsers = new Set(pwaRealClicks.filter(e => e.user_email).map(e => e.user_email)).size;
  const pwaBannerUniqueUsers = new Set(pwaBannerShown.filter(e => e.user_email).map(e => e.user_email)).size;
  const pwaInstalledSessions = pwaOpenedInstalled.length;
  const pwaInstalledUsers = new Set(pwaOpenedInstalled.filter(e => e.user_email).map(e => e.user_email)).size;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700">Engagement & Analytics</p>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${days === d ? "bg-white text-[#2D6A4F] shadow-sm" : "text-gray-500"}`}
            >
              {d}g
            </button>
          ))}
          <button onClick={load} className="p-1 ml-1 text-gray-400 hover:text-[#2D6A4F]">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. Retention / Return */}
      <Section title="↩️ Utenti che tornano" subtitle={`Ultimi ${days} giorni`}>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Utenti totali" value={uniqueUsers} icon={Users} color="text-blue-600 bg-blue-50" />
          <Metric label="Utenti che tornano" value={returningUsers} icon={TrendingUp} color="text-green-600 bg-green-50" />
          <Metric label="Free che tornano" value={returningFreeUniq} emoji="👤" color="text-gray-600 bg-gray-50" />
          <Metric label="Premium che tornano" value={returningPremiumUniq} emoji="✨" color="text-amber-600 bg-amber-50" />
        </div>
        <p className="text-[10px] text-gray-400 mt-2">* "Torna" = ha aperto l'app più di 1 volta nel periodo</p>
      </Section>

      {/* 2. Recipe & Occasion engagement */}
      <Section title="📖 Accesso alle ricette" subtitle={`${recipeViews.length} visualizzazioni totali`}>
        <Metric label="Utenti che hanno visto ricette" value={usersViewedRecipes} icon={BookOpen} color="text-green-600 bg-green-50" />

        {topRecipes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-bold text-gray-500 mb-2">Top ricette visualizzate</p>
            <div className="space-y-1.5">
              {topRecipes.map(([title, count], i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{title}</p>
                  </div>
                  <span className="text-xs font-bold text-[#2D6A4F]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {topOccasions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-bold text-gray-500 mb-2">Occasioni più cliccate</p>
            <div className="space-y-1.5">
              {topOccasions.map(([label, count], i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-gray-700">{label}</p>
                      <span className="text-xs font-bold text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#2D6A4F] h-1.5 rounded-full"
                        style={{ width: `${Math.round((count / topOccasions[0][1]) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topRecipes.length === 0 && topOccasions.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">Nessun dato ancora. Il tracking si attiverà man mano che gli utenti usano l'app.</p>
        )}
      </Section>

      {/* 3. PWA Install */}
      <Section title="📲 Installazione PWA" subtitle="Banner mostrato + click installa">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Banner mostrato" value={pwaBannerTotal} emoji="👁️" color="text-gray-600 bg-gray-50" />
          <Metric label="Utenti (banner)" value={pwaBannerUniqueUsers} emoji="👤" color="text-gray-600 bg-gray-50" />
          <Metric label="Click installa" value={pwaTotal} icon={Smartphone} color="text-purple-600 bg-purple-50" />
          <Metric label="Utenti (click)" value={pwaUniqueUsers} emoji="✅" color="text-purple-600 bg-purple-50" />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-2">📱 Aberturas como app instalado</p>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Sessões no app instalado" value={pwaInstalledSessions} emoji="📱" color="text-green-600 bg-green-50" />
            <Metric label="Usuários com app instalado" value={pwaInstalledUsers} emoji="✅" color="text-green-600 bg-green-50" />
          </div>
          {pwaInstalledSessions === 0 && <p className="text-[10px] text-gray-400 mt-2">Nenhuma sessão como app instalado ainda no período.</p>}
        </div>
        {pwaTotal === 0 && pwaBannerTotal === 0 && pwaInstalledSessions === 0 && (
          <p className="text-[10px] text-gray-400 mt-2">Nessun dato nel periodo.</p>
        )}
      </Section>

      {/* 4. Session duration */}
      <Section title="⏱ Sessioni & Tempo in app" subtitle={`${sessionStarts.length} sessioni avviate nel periodo`}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Metric label="Sessioni totali" value={sessionStarts.length} icon={Clock} color="text-[#2D6A4F] bg-green-50" />
          <Metric label="Sessioni con durata" value={durations.length} emoji="⏱" color="text-blue-600 bg-blue-50" />
        </div>
        {durations.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
              <Clock className="w-6 h-6 text-[#2D6A4F]" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmtSeconds(avgDuration)}</p>
                <p className="text-[10px] text-gray-400 leading-tight">media per sessione</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
              <Clock className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmtSeconds(avgDurationPerUser)}</p>
                <p className="text-[10px] text-gray-400 leading-tight">media per utente</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-gray-400">Il tempo medio si calcolerà man mano che gli utenti chiudono l'app. Le sessioni avviate sono già visibili sopra.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
      <div>
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, icon: Icon, emoji, color }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
        {emoji ? <span className="text-sm">{emoji}</span> : Icon ? <Icon className="w-4 h-4" /> : null}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
      </div>
    </div>
  );
}