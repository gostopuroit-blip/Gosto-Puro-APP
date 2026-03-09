import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Users, BookOpen, Smartphone, Clock, TrendingUp } from "lucide-react";
import { fmtSeconds } from "./engagementUtils";
import AdminEngagementUsers from "./AdminEngagementUsers";
import AdminPremiumFunnel from "./AdminPremiumFunnel";
import AdminSessionsChart from "./AdminSessionsChart";
import AdminRetention from "./AdminRetention";
import AdminTopUsers from "./AdminTopUsers";
import AdminFreePremiumChart from "./AdminFreePremiumChart";

const DAYS_OPTIONS = [7, 14, 30];

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

export default function AdminEngagement() {
  const [days, setDays] = useState(7);
  const [events, setEvents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState([]);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef(null);

  useEffect(() => { load(); }, [days]);

  // Refresh "online now" every 60 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      loadRecent();
      setNow(new Date());
    }, 60000);
    loadRecent();
    return () => clearInterval(timerRef.current);
  }, []);

  const loadRecent = async () => {
    // Fetch last 5 minutes of session_start events
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    try {
      const recent = await base44.entities.AppAnalytics.filter(
        { event_type: "session_start", created_date: { $gte: since } },
        "-created_date", 100
      );
      setRecentEvents(recent);
    } catch {}
  };

  const load = async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    try {
      // Fetch events and users in parallel
      const [eventsResult, usersResult] = await Promise.all([
        base44.entities.AppAnalytics.filter({ date: { $gte: cutoffStr } }, "-created_date", 2000).catch(() => []),
        (async () => {
          try {
            let users = [];
            let skip = 0;
            let maxIterations = 10;
            let iterations = 0;
            while (iterations < maxIterations) {
              const batch = await base44.entities.User.list("-created_date", 200, skip);
              users = users.concat(batch);
              if (batch.length < 200) break;
              skip += 200;
              iterations++;
            }
            return users;
          } catch {
            return [];
          }
        })(),
      ]);
      setEvents(eventsResult || []);
      setAllUsers(usersResult || []);
    } catch {
      setEvents([]);
      setAllUsers([]);
    }
    setLoading(false);
  };

  // --- Derived metrics ---
  const adminEmails = new Set(allUsers.filter(u => u.role === "admin").map(u => u.email));
  const nonAdminEvents = events.filter(e => !e.user_email || !adminEmails.has(e.user_email));

  // Helper: unique identifier per user/session (email if available, session_id as fallback)
  const uid = (e) => e.user_email || e.session_id;

  const sessionStarts = nonAdminEvents.filter(e => e.event_type === "session_start");
  const sessionEnds = nonAdminEvents.filter(e => e.event_type === "session_end" && e.session_duration_seconds > 0);
  const recipeViews = nonAdminEvents.filter(e => e.event_type === "recipe_view");
  const occasionClicks = nonAdminEvents.filter(e => e.event_type === "occasion_click");
  const pwaClicks = nonAdminEvents.filter(e => e.event_type === "pwa_install_click");
  const recipeSaves = nonAdminEvents.filter(e => e.event_type === "recipe_saved");
  const plannerCreated = nonAdminEvents.filter(e => e.event_type === "planner_created");

  // UTM visits
  const utmVisits = nonAdminEvents.filter(e => e.event_type === "utm_visit");
  const utmBySouce = {};
  utmVisits.forEach(e => {
    const src = e.occasion_label || "desconhecido";
    if (!utmBySouce[src]) utmBySouce[src] = { visits: 0, users: new Set() };
    utmBySouce[src].visits++;
    if (e.user_email) utmBySouce[src].users.add(e.user_email);
  });
  const topUtm = Object.entries(utmBySouce)
    .map(([src, d]) => ({ src, visits: d.visits, users: d.users.size }))
    .sort((a, b) => b.visits - a.visits);

  // Top receitas salvas
  const saveCounts = {};
  recipeSaves.forEach(e => {
    if (e.recipe_title) saveCounts[e.recipe_title] = (saveCounts[e.recipe_title] || 0) + 1;
  });
  const topSaved = Object.entries(saveCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Free vs Premium unique users (use uid as fallback)
  const freeUsers = new Set(nonAdminEvents.filter(e => e.event_type === "session_start" && e.user_plan === "free" && uid(e)).map(uid)).size;
  const premiumUsers = new Set(nonAdminEvents.filter(e => e.event_type === "session_start" && e.user_plan === "premium" && uid(e)).map(uid)).size;

  // Unique returning users (more than 1 session)
  const sessionsByUser = {};
  sessionStarts.forEach(e => {
    const key = uid(e);
    if (key) sessionsByUser[key] = (sessionsByUser[key] || 0) + 1;
  });
  const returningUsers = Object.values(sessionsByUser).filter(c => c > 1).length;
  const uniqueUsers = Object.keys(sessionsByUser).length;

  // Free vs Premium returning
  const returningFree = sessionStarts.filter(e => e.user_plan === "free" && uid(e) && (sessionsByUser[uid(e)] || 0) > 1);
  const returningPremium = sessionStarts.filter(e => e.user_plan === "premium" && uid(e) && (sessionsByUser[uid(e)] || 0) > 1);
  const returningFreeUniq = new Set(returningFree.map(uid)).size;
  const returningPremiumUniq = new Set(returningPremium.map(uid)).size;

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

  // Online now — unique users with session_start in last 5 min (no websocket needed)
  const onlineNowUsers = new Set(recentEvents.filter(e => e.user_email).map(e => e.user_email)).size;
  const onlineNowSessions = recentEvents.length;

  // Today's entries (session_starts today)
  const todayStr = now.toISOString().slice(0, 10);
  const todaySessions = nonAdminEvents.filter(e => e.event_type === "session_start" && e.date === todayStr);
  const todayUniqueUsers = new Set(todaySessions.filter(e => e.user_email).map(e => e.user_email)).size;

  // PWA — separate banner impressions from real install clicks
  const pwaBannerShown = pwaClicks.filter(e => e.occasion_label === "banner_shown");
  const pwaOpenedInstalled = pwaClicks.filter(e => e.occasion_label === "pwa_opened_installed");
  const pwaRealClicks = pwaClicks.filter(e => e.occasion_label !== "banner_shown" && e.occasion_label !== "pwa_opened_installed");
  const pwaTotal = pwaRealClicks.length;
  const pwaBannerTotal = pwaBannerShown.length;
  const pwaUniqueUsers = new Set(pwaRealClicks.filter(e => e.user_email).map(e => e.user_email)).size;
  const pwaBannerUniqueUsers = new Set(pwaBannerShown.filter(e => e.user_email).map(e => e.user_email)).size;
  const pwaInstalledSessions = pwaOpenedInstalled.length;
  const pwaInstalledUsersSet = new Set(pwaOpenedInstalled.filter(e => e.user_email).map(e => e.user_email));
  const pwaInstalledUsers = pwaInstalledUsersSet.size;

  // PWA installed users: how many returned (>1 session) vs opened only once
  const pwaInstalledReturned = [...pwaInstalledUsersSet].filter(email => (sessionsByUser[email] || 0) > 1).length;
  const pwaInstalledNotReturned = pwaInstalledUsers - pwaInstalledReturned;
  // Users who never installed (opened via browser only, not standalone)
  const nonInstalledActiveUsers = uniqueUsers - [...pwaInstalledUsersSet].filter(email => sessionsByUser[email]).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Online Now + Today */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">🟢 Tempo Real</p>
          <span className="text-[10px] text-gray-400">atualiza a cada 60s</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-green-700 font-semibold uppercase tracking-wide">Online agora</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{onlineNowUsers}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">usuários únicos nos últimos 5 min</p>
            {onlineNowSessions > 0 && <p className="text-[10px] text-green-600 mt-0.5">{onlineNowSessions} sess{onlineNowSessions !== 1 ? "ões" : "ão"}</p>}
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">📅</span>
              <p className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide">Hoje</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{todayUniqueUsers}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">usuários únicos hoje</p>
            <p className="text-[10px] text-blue-600 mt-0.5">{todaySessions.length} sess{todaySessions.length !== 1 ? "ões" : "ão"} abertas</p>
          </div>
        </div>
      </div>

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

      {/* UTM / Origem do tráfego */}
      <Section title="🔗 Origem do Tráfego (UTM)" subtitle="De onde os usuários chegam ao app — via links com ?utm_source=">
        {topUtm.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Nenhum acesso via link UTM registrado ainda.</p>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-1">Como usar:</p>
              <p className="text-[11px] text-amber-600 leading-relaxed">Adicione <code className="bg-amber-100 px-1 rounded">?utm_source=tiktok</code> no final dos seus links. Exemplos:</p>
              <div className="mt-2 space-y-1">
                {["tiktok", "instagram", "pinterest", "facebook", "email", "whatsapp", "google", "youtube", "linkedin", "twitter"].map(s => (
                  <p key={s} className="text-[10px] font-mono text-amber-700 bg-amber-100 rounded px-2 py-0.5 truncate">
                    gostopuro.it?utm_source={s}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Metric label="Total de visitas UTM" value={utmVisits.length} emoji="🔗" color="text-blue-600 bg-blue-50" />
              <Metric label="Fontes distintas" value={topUtm.length} emoji="📊" color="text-purple-600 bg-purple-50" />
            </div>
            {topUtm.map((item, i) => {
              const sourceEmoji = {
                tiktok: "🎵", instagram: "📸", facebook: "👥", email: "📧",
                whatsapp: "💬", youtube: "▶️", google: "🔍", twitter: "🐦", x: "🐦"
              }[item.src.toLowerCase()] || "🔗";
              return (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <span className="text-xl w-8 text-center">{sourceEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-gray-800 capitalize">{item.src}</p>
                      <span className="text-xs font-bold text-[#2D6A4F]">{item.visits} visitas</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#2D6A4F] h-1.5 rounded-full" style={{ width: `${Math.round((item.visits / topUtm[0].visits) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.users} usuário{item.users !== 1 ? "s" : ""} únicos</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* 0a. Sessions chart */}
      <Section title="📊 Sessões por dia" subtitle={`Últimos ${days} dias — verde escuro = sessões, verde claro = usuários únicos`}>
        <AdminSessionsChart events={nonAdminEvents} days={days} />
      </Section>

      {/* 0. Sessions & Time — moved to top */}
      <Section
        title="⏱ Sessões & Tempo no app"
        subtitle="Quantas vezes o app foi aberto e quanto tempo os usuários ficam"
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Metric
            label="Total de sessões abertas"
            value={sessionStarts.length}
            icon={Clock}
            color="text-[#2D6A4F] bg-green-50"
            tooltip="Cada vez que alguém abre o app conta como 1 sessão"
          />
          <Metric
            label="Sessões com duração registrada"
            value={durations.length}
            emoji="⏱"
            color="text-blue-600 bg-blue-50"
            tooltip="Sessões em que o app conseguiu registrar o tempo antes de fechar"
          />
          <Metric
            label="Usuários únicos no período"
            value={uniqueUsers}
            icon={Users}
            color="text-purple-600 bg-purple-50"
            tooltip="Número de e-mails distintos que abriram o app"
          />
          <Metric
            label="Usuários que voltaram"
            value={returningUsers}
            icon={TrendingUp}
            color="text-green-600 bg-green-50"
            tooltip="Abriram o app mais de 1 vez no período"
          />
        </div>

        {durations.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-green-50 rounded-2xl p-4">
              <Clock className="w-6 h-6 text-[#2D6A4F] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmtSeconds(avgDuration)}</p>
                <p className="text-xs font-semibold text-gray-600">Média por sessão</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Tempo médio que o usuário fica no app em cada visita</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-4">
              <Clock className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmtSeconds(avgDurationPerUser)}</p>
                <p className="text-xs font-semibold text-gray-600">Média por usuário</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Soma de todas as sessões de cada pessoa, depois tira a média entre elas</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-semibold">Aguardando dados de duração</p>
            <p className="text-[10px] text-gray-400 mt-1">O tempo é registrado quando o usuário fecha ou minimiza o app. As sessões abertas já aparecem acima.</p>
          </div>
        )}
      </Section>

      {/* 1. Retention / Return */}
      <Section title="↩️ Usuários que voltam" subtitle={`Últimos ${days} dias`}>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Usuários únicos" value={uniqueUsers} icon={Users} color="text-blue-600 bg-blue-50" />
          <Metric label="Usuários que voltaram" value={returningUsers} icon={TrendingUp} color="text-green-600 bg-green-50" />
          <Metric label="Free que voltaram" value={returningFreeUniq} emoji="👤" color="text-gray-600 bg-gray-50" />
          <Metric label="Premium que voltaram" value={returningPremiumUniq} emoji="✨" color="text-amber-600 bg-amber-50" />
        </div>
        <p className="text-[10px] text-gray-400 mt-2">* "Voltou" = abriu o app mais de 1 vez no período</p>
      </Section>

      {/* 2. Recipe & Occasion engagement */}
      <Section title="📖 Acesso às receitas" subtitle={`${recipeViews.length} visualizações totais`}>
        <Metric label="Usuários que viram receitas" value={usersViewedRecipes} icon={BookOpen} color="text-green-600 bg-green-50" />

        {topRecipes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-bold text-gray-500 mb-2">Top receitas visualizadas</p>
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
            <p className="text-xs font-bold text-gray-500 mb-2">Ocasiões mais clicadas</p>
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
          <p className="text-xs text-gray-400 mt-2">Sem dados ainda. O tracking ativará conforme os usuários usam o app.</p>
        )}
      </Section>

      {/* 3. PWA Install */}
      <Section title="📲 Instalação PWA" subtitle={`Métricas de instalação e uso do app instalado`}>
        
        {/* Bloco 1: Funil de instalação */}
        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Funil de instalação</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <span className="text-lg">👁️</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700">Banner exibido</p>
                <p className="text-[10px] text-gray-400">Usuários que viram o convite para instalar</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{pwaBannerUniqueUsers}</p>
                <p className="text-[10px] text-gray-400">{pwaBannerTotal} impressões</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-50 rounded-xl p-3">
              <span className="text-lg">👆</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700">Clicaram em instalar</p>
                <p className="text-[10px] text-gray-400">Tocaram no botão de instalação</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-700">{pwaUniqueUsers}</p>
                <p className="text-[10px] text-gray-400">{pwaTotal} cliques</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
              <span className="text-lg">📱</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700">Abriram como app instalado</p>
                <p className="text-[10px] text-gray-400">Confirmado via modo standalone — instalação real</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-700">{pwaInstalledUsers}</p>
                <p className="text-[10px] text-gray-400">{pwaInstalledSessions} sessões</p>
              </div>
            </div>
          </div>
          {pwaBannerUniqueUsers > 0 && (
            <p className="text-[10px] text-gray-400 mt-1.5">
              Taxa de instalação confirmada: <span className="font-bold text-green-600">{Math.round((pwaInstalledUsers / pwaBannerUniqueUsers) * 100)}%</span> dos que viram o banner
            </p>
          )}
        </div>

        {/* Bloco 2: Quem instalou */}
        {pwaInstalledUsers > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Usuários com app instalado</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-green-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-green-700">{pwaInstalledUsers}</p>
                <p className="text-[9px] text-gray-500 leading-tight">Total instalado</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-blue-700">{pwaInstalledReturned}</p>
                <p className="text-[9px] text-gray-500 leading-tight">Voltaram (+1 sessão)</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-gray-600">{pwaInstalledNotReturned}</p>
                <p className="text-[9px] text-gray-500 leading-tight">Não voltaram</p>
              </div>
            </div>
            {/* Barra de retenção */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>Voltaram: {Math.round((pwaInstalledReturned / pwaInstalledUsers) * 100)}%</span>
              <span>Não voltaram: {Math.round((pwaInstalledNotReturned / pwaInstalledUsers) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="bg-[#2D6A4F] h-full rounded-l-full" style={{ width: `${Math.round((pwaInstalledReturned / pwaInstalledUsers) * 100)}%` }} />
              <div className="bg-gray-200 h-full rounded-r-full flex-1" />
            </div>
            {/* Lista de e-mails dos instalados */}
            <div className="mt-2">
              <p className="text-[10px] text-gray-400 mb-1.5">Quem instalou (e-mails únicos):</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {[...pwaInstalledUsersSet].map((email, i) => {
                  const sessions = sessionsByUser[email] || 1;
                  const returned = sessions > 1;
                  return (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-sm">{returned ? "🔄" : "1️⃣"}</span>
                      <p className="text-[11px] text-gray-700 flex-1 truncate">{email}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${returned ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                        {sessions} sess{sessions !== 1 ? "ões" : "ão"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bloco 3: Usuários sem app */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-600">Ativos só pelo browser</p>
            <p className="text-[10px] text-gray-400">Nunca abriram pelo app instalado</p>
          </div>
          <p className="text-2xl font-bold text-gray-700">{nonInstalledActiveUsers}</p>
        </div>

        {pwaTotal === 0 && pwaBannerTotal === 0 && pwaInstalledSessions === 0 && (
          <p className="text-[10px] text-gray-400">Sem dados no período.</p>
        )}
      </Section>

      {/* NEW: Receitas Salvas */}
      <Section title="❤️ Receitas Salvas" subtitle={`${recipeSaves.length} saves no período · ${new Set(recipeSaves.filter(e => e.user_email).map(e => e.user_email)).size} usuários`}>
        {topSaved.length > 0 ? (
          <div className="space-y-1.5">
            {topSaved.map(([title, count], i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs text-gray-700 truncate">{title}</p>
                    <span className="text-xs font-bold text-amber-600">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${Math.round((count / topSaved[0][1]) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Sem saves ainda no período.</p>
        )}
      </Section>

      {/* NEW: Planners criados */}
      <Section title="📅 Planners Criados" subtitle="Quantos meal plans foram gerados no período">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Total de planners criados" value={plannerCreated.length} emoji="📅" color="text-[#2D6A4F] bg-green-50" />
          <Metric label="Usuários que criaram" value={new Set(plannerCreated.filter(e => e.user_email).map(e => e.user_email)).size} emoji="👤" color="text-purple-600 bg-purple-50" />
        </div>
        {plannerCreated.length === 0 && <p className="text-[10px] text-gray-400 mt-1">Sem planners criados no período.</p>}
      </Section>

      {/* NEW: Free vs Premium */}
      <Section title="👥 Free vs Premium" subtitle="Sessões diárias por tipo de plano">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Metric label="Usuários Free ativos" value={freeUsers} emoji="👤" color="text-gray-600 bg-gray-50" />
          <Metric label="Usuários Premium ativos" value={premiumUsers} emoji="✨" color="text-amber-600 bg-amber-50" />
        </div>
        <AdminFreePremiumChart events={nonAdminEvents} days={days} />
      </Section>

      {/* 4. Retenção D1/D7/D30 */}
      <Section title="🔄 Retenção de Usuários" subtitle="Percentagem que voltou no D1, D7 e D30 após cadastro">
        <AdminRetention events={nonAdminEvents} allUsers={allUsers} />
      </Section>

      {/* 5. Premium Funnel */}
      <Section title="💳 Funil Premium" subtitle="Da visualização do paywall até a conversão">
        <AdminPremiumFunnel events={nonAdminEvents} />
      </Section>

      {/* 6. Top Users */}
      <Section title="🏆 Top Usuários" subtitle="Ranking por engagement score no período">
        <AdminTopUsers events={nonAdminEvents} allUsers={allUsers} />
      </Section>

      {/* 7. Scroll das receitas */}
      <Section title="📜 Profundidade de Leitura" subtitle="Quanto os usuários leram as receitas">
        <ScrollDepthStats events={nonAdminEvents} />
      </Section>

      {/* 8. Per-user breakdown */}
      <Section title="👤 Métricas por usuário" subtitle={`${allUsers.length} usuários cadastrados · ${uniqueUsers} ativos no período`}>
        <AdminEngagementUsers events={nonAdminEvents} allUsers={allUsers} />
      </Section>


    </div>
  );
}

function ScrollDepthStats({ events }) {
  const scrollEvents = events.filter(e => e.event_type === "recipe_scroll");
  const total = new Set(scrollEvents.filter(e => e.recipe_id).map(e => `${e.user_email}-${e.recipe_id}`)).size;
  const pcts = [25, 50, 75, 100];
  const counts = pcts.map(p => ({
    pct: p,
    users: new Set(scrollEvents.filter(e => e.scroll_percentage >= p && e.user_email).map(e => `${e.user_email}-${e.recipe_id}`)).size,
  }));
  if (!total) return <p className="text-xs text-gray-400">Sem dados de scroll ainda. Aparecerá quando usuários lerem receitas.</p>;
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-400">{total} leituras únicas (usuário × receita)</p>
      {counts.map(c => (
        <div key={c.pct} className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 w-8">{c.pct}%</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-[#2D6A4F] h-2 rounded-full" style={{ width: `${Math.max(4, Math.round((c.users / total) * 100))}%` }} />
          </div>
          <span className="text-xs font-bold text-gray-700 w-8 text-right">{c.users}</span>
        </div>
      ))}
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