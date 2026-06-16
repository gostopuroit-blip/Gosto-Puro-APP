import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminRecipeEngagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [searchPage, setSearchPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => { load(); }, [days]);

  const load = async () => {
    setLoading(true);
    const cutoffStr = days === 0 ? null : (() => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); })();
    try {
      let all = [];
      let skip = 0;
      while (true) {
        const filter = cutoffStr ? { date: { $gte: cutoffStr } } : {};
        const batch = await base44.entities.AppAnalytics.filter(filter, "-created_date", 500, skip).catch(() => []);
        all = all.concat(batch);
        if (batch.length < 500) break;
        skip += 500;
        if (skip > 10000) break;
      }
      setEvents(all);
    } catch { setEvents([]); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-purple-600 animate-spin" /></div>;

  // --- Derived data ---
  const recipeViews = events.filter(e => e.event_type === "recipe_view");
  const recipeSaves = events.filter(e => e.event_type === "recipe_saved");
  const recipeScrolls = events.filter(e => e.event_type === "recipe_scroll");
  const searches = events.filter(e => e.event_type === "recipe_search");
  const viewStarts = events.filter(e => e.event_type === "recipe_view_start");
  const viewEnds = events.filter(e => e.event_type === "recipe_view_end");
  const sessionStarts = events.filter(e => e.event_type === "session_start");
  const planners = events.filter(e => e.event_type === "planner_created");
  const premiumPurchases = events.filter(e => e.event_type === "premium_purchase");
  const utmVisits = events.filter(e => e.event_type === "utm_visit");
  const occasionClicks = events.filter(e => e.event_type === "occasion_click");
  const screenLoads = events.filter(e => e.event_type === "screen_load");
  const uiClicks = events.filter(e => e.event_type === "ui_click");
  const pushOpened = events.filter(e => e.event_type === "push_opened");
  const pushSent = events.filter(e => e.event_type === "push_sent");

  // --- 1. Search Analytics ---
  const searchQueries = {};
  searches.forEach(e => {
    const q = e.occasion_label || "?";
    if (!searchQueries[q]) searchQueries[q] = { count: 0, noResults: 0 };
    searchQueries[q].count++;
    if ((e.results_count || 0) === 0) searchQueries[q].noResults++;
  });
  const allSearchesSorted = Object.entries(searchQueries).sort((a, b) => b[1].count - a[1].count);
  const topSearches = allSearchesSorted; // all, paginated in UI
  const noResultSearches = Object.entries(searchQueries).filter(([, v]) => v.noResults > 0).sort((a, b) => b[1].noResults - a[1].noResults).slice(0, 5);

  // Searches per day
  const searchByDay = {};
  searches.forEach(e => { searchByDay[e.date] = (searchByDay[e.date] || 0) + 1; });
  const searchDayData = Object.entries(searchByDay).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date: date.slice(5), count }));

  // Click rate: search → recipe
  const searchesWithClick = searches.filter(e => e.recipe_id).length;
  const searchClickRate = searches.length > 0 ? Math.round((searchesWithClick / searches.length) * 100) : 0;

  // --- 2. Recipe Time ---
  const durationByRecipe = {};
  viewEnds.forEach(e => {
    if (!e.recipe_id || !e.duration_seconds) return;
    if (!durationByRecipe[e.recipe_id]) durationByRecipe[e.recipe_id] = { title: e.recipe_title || e.recipe_id, durations: [] };
    durationByRecipe[e.recipe_id].durations.push(e.duration_seconds);
  });
  const recipeTimeRanking = Object.values(durationByRecipe)
    .map(r => ({ title: r.title, avg: Math.round(r.durations.reduce((a, b) => a + b, 0) / r.durations.length) }))
    .sort((a, b) => b.avg - a.avg).slice(0, 8);

  const allDurations = viewEnds.filter(e => e.duration_seconds).map(e => e.duration_seconds);
  const avgTime = allDurations.length > 0 ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length) : 0;

  // --- 3. Save Rate ---
  const viewsByRecipe = {};
  recipeViews.forEach(e => { if (e.recipe_title) viewsByRecipe[e.recipe_title] = (viewsByRecipe[e.recipe_title] || 0) + 1; });
  const savesByRecipe = {};
  recipeSaves.forEach(e => { if (e.recipe_title) savesByRecipe[e.recipe_title] = (savesByRecipe[e.recipe_title] || 0) + 1; });
  const saveRates = Object.keys(viewsByRecipe)
    .map(title => ({ title, views: viewsByRecipe[title], saves: savesByRecipe[title] || 0, rate: Math.round(((savesByRecipe[title] || 0) / viewsByRecipe[title]) * 100) }))
    .filter(r => r.views >= 3);
  const topSaveRate = [...saveRates].sort((a, b) => b.rate - a.rate).slice(0, 5);
  const lowSaveRate = [...saveRates].sort((a, b) => a.rate - b.rate).slice(0, 5);

  // --- 4. Engagement Score ---
  const scroll100 = recipeScrolls.filter(e => e.scroll_percentage >= 100);
  const scroll100ByRecipe = {};
  scroll100.forEach(e => { if (e.recipe_title) scroll100ByRecipe[e.recipe_title] = (scroll100ByRecipe[e.recipe_title] || 0) + 1; });
  const engagementScores = Object.keys(viewsByRecipe).map(title => {
    const views = viewsByRecipe[title] || 0;
    const saves = savesByRecipe[title] || 0;
    const scroll = scroll100ByRecipe[title] || 0;
    return { title, score: views + (saves * 3) + (scroll * 2) };
  }).sort((a, b) => b.score - a.score).slice(0, 8);

  // --- 5. Bounce Rate ---
  const bounceThreshold = 5;
  const bounceByRecipe = {};
  viewEnds.forEach(e => {
    if (!e.recipe_title) return;
    if (!bounceByRecipe[e.recipe_title]) bounceByRecipe[e.recipe_title] = { total: 0, bounced: 0 };
    bounceByRecipe[e.recipe_title].total++;
    if ((e.duration_seconds || 0) < bounceThreshold) bounceByRecipe[e.recipe_title].bounced++;
  });
  const highBounce = Object.entries(bounceByRecipe)
    .map(([title, d]) => ({ title, rate: Math.round((d.bounced / d.total) * 100), total: d.total }))
    .filter(r => r.total >= 3).sort((a, b) => b.rate - a.rate).slice(0, 5);

  // --- 6. Premium Conversion by Source ---
  const premiumBySource = {};
  utmVisits.forEach(e => {
    const src = e.occasion_label || "Direct";
    if (!premiumBySource[src]) premiumBySource[src] = { visits: 0, purchases: 0 };
    premiumBySource[src].visits++;
  });
  premiumPurchases.forEach(e => {
    const src = e.source || "Direct";
    if (!premiumBySource[src]) premiumBySource[src] = { visits: 0, purchases: 0 };
    premiumBySource[src].purchases++;
  });
  const premiumConversion = Object.entries(premiumBySource)
    .map(([src, d]) => ({ src, visits: d.visits, purchases: d.purchases, rate: d.visits > 0 ? Math.round((d.purchases / d.visits) * 100) : 0 }))
    .sort((a, b) => b.purchases - a.purchases);

  // --- 7. Activity by Hour ---
  const hourCounts = Array(24).fill(0);
  sessionStarts.forEach(e => {
    if (e.created_date) {
      const h = new Date(e.created_at || e.created_date).getHours();
      hourCounts[h]++;
    }
  });
  const hourData = hourCounts.map((count, h) => ({ hour: `${String(h).padStart(2, "0")}h`, count }));

  // --- 8. Premium Churn ---
  const premiumUsers = events.filter(e => e.event_type === "session_start" && e.user_plan === "premium");
  const uniquePremiumEmails = new Set(premiumUsers.filter(e => e.user_email).map(e => e.user_email)).size;

  // --- 9. Discovery Funnel ---
  const homeSessions = sessionStarts.length;
  const occasionClickCount = occasionClicks.length;
  const recipeViewCount = recipeViews.length;
  const recipeSaveCount = recipeSaves.length;
  const plannerCount = planners.length;
  const funnelSteps = [
    { step: "Home (Sessões)", count: homeSessions },
    { step: "Ocasião clicada", count: occasionClickCount },
    { step: "Receita visualizada", count: recipeViewCount },
    { step: "Receita salva", count: recipeSaveCount },
    { step: "Planner criado", count: plannerCount },
  ];

  // --- 10. Screen Load ---
  const screenTimes = {};
  screenLoads.forEach(e => {
    const s = e.occasion_label || "unknown";
    if (!screenTimes[s]) screenTimes[s] = [];
    if (e.load_time_ms) screenTimes[s].push(e.load_time_ms);
  });
  const screenPerf = Object.entries(screenTimes)
    .map(([screen, times]) => ({ screen, avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length) }))
    .sort((a, b) => b.avg - a.avg).slice(0, 8);

  // --- 11. UI Click Heatmap ---
  const clickCounts = {};
  uiClicks.forEach(e => {
    const k = e.occasion_label || "unknown";
    clickCounts[k] = (clickCounts[k] || 0) + 1;
  });
  const topClicks = Object.entries(clickCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // --- 12. Push Analytics ---
  // push_sent guarda results_count = quantas notificações foram enviadas naquele disparo
  const pushSentTotal = pushSent.reduce((a, e) => a + (e.results_count || 0), 0);
  const pushOpenRate = pushSentTotal > 0 ? Math.round((pushOpened.length / pushSentTotal) * 100) : 0;
  const pushToRecipe = events.filter(e => e.event_type === "push_recipe_open").length;

  // --- 13. Retention by Source ---
  const sourceUsers = {};
  utmVisits.forEach(e => {
    if (!e.user_email) return;
    const src = e.occasion_label || "Direct";
    if (!sourceUsers[src]) sourceUsers[src] = new Set();
    sourceUsers[src].add(e.user_email);
  });
  const sessionsByUser = {};
  sessionStarts.forEach(e => {
    if (e.user_email) sessionsByUser[e.user_email] = (sessionsByUser[e.user_email] || 0) + 1;
  });
  const retentionBySource = Object.entries(sourceUsers).map(([src, users]) => {
    const total = users.size;
    const returned = [...users].filter(email => (sessionsByUser[email] || 0) > 1).length;
    return { src, total, returned, rate: total > 0 ? Math.round((returned / total) * 100) : 0 };
  }).sort((a, b) => b.returned - a.returned);

  // --- 14. Recipe → Planner Rate ---
  const plannerFromRecipe = planners.filter(e => e.recipe_id).length;
  const plannerRate = recipeViewCount > 0 ? ((plannerFromRecipe / recipeViewCount) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-5">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700">Recipe & Advanced Analytics</p>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {[7, 14, 30, 0].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${days === d ? "bg-white text-purple-700 shadow-sm" : "text-gray-500"}`}>{d === 0 ? "∞" : `${d}g`}</button>
          ))}
          <button onClick={load} className="p-1 ml-1 text-gray-400 hover:text-purple-600"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* 1. Search Analytics */}
      <SearchAnalyticsSection
        searches={searches}
        topSearches={topSearches}
        noResultSearches={noResultSearches}
        searchClickRate={searchClickRate}
        searchQueries={searchQueries}
        searchDayData={searchDayData}
        searchPage={searchPage}
        setSearchPage={setSearchPage}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
      />

      {/* 2. Recipe Time */}
      <Section title="⏱ Tempo dentro da Receita" subtitle="Quanto tempo os usuários passam lendo cada receita">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Metric label="Média geral" value={avgTime > 0 ? `${avgTime}s` : "-"} color="text-blue-600 bg-blue-50" />
          <Metric label="Leituras registradas" value={viewEnds.length} />
        </div>
        {recipeTimeRanking.length > 0 ? (
          <>
            <p className="text-xs font-bold text-gray-500 mb-2">Receitas com maior tempo médio</p>
            <div className="space-y-1.5">
              {recipeTimeRanking.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                  <p className="text-xs flex-1 text-gray-700 truncate">{r.title}</p>
                  <span className="text-xs font-bold text-blue-600">{r.avg}s</span>
                </div>
              ))}
            </div>
          </>
        ) : <EmptyState text="Adicione tracking de recipe_view_start/end com duration_seconds." />}
      </Section>

      {/* 3. Save Rate */}
      <Section title="💾 Save Rate por Receita" subtitle="recipe_saved / recipe_view">
        {saveRates.length > 0 ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">✅ Top Save Rate</p>
              {topSaveRate.map((r, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs flex-1 text-gray-700 truncate">{r.title}</p>
                  <span className="text-xs text-gray-400">{r.views}v / {r.saves}s</span>
                  <span className="text-xs font-bold text-green-600">{r.rate}%</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">⚠️ Baixo Save Rate</p>
              {lowSaveRate.map((r, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs flex-1 text-gray-700 truncate">{r.title}</p>
                  <span className="text-xs text-gray-400">{r.views}v / {r.saves}s</span>
                  <span className="text-xs font-bold text-red-500">{r.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState text="Dados insuficientes. Precisamos de recipe_view + recipe_saved com recipe_title." />}
      </Section>

      {/* 4. Engagement Score */}
      <Section title="🏆 Engagement Score" subtitle="views + (saves×3) + (scroll100×2)">
        {engagementScores.length > 0 ? (
          <div className="space-y-1.5">
            {engagementScores.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                <p className="text-xs flex-1 text-gray-700 truncate">{r.title}</p>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{r.score}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Sem dados suficientes para calcular o score." />}
      </Section>

      {/* 5. Bounce Rate */}
      <Section title="🚀 Bounce Rate" subtitle="Saídas em menos de 5 segundos">
        {highBounce.length > 0 ? (
          <div className="space-y-1.5">
            {highBounce.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <p className="text-xs flex-1 text-gray-700 truncate">{r.title}</p>
                <span className="text-xs text-gray-400">{r.total} views</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.rate > 50 ? "text-red-600 bg-red-50" : "text-orange-600 bg-orange-50"}`}>{r.rate}%</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Precisamos de recipe_view_end com duration_seconds para calcular." />}
      </Section>

      {/* 6. Premium Conversion by Source */}
      <Section title="💳 Conversão Premium por Origem" subtitle="De qual fonte vieram os usuários que compraram">
        {premiumConversion.length > 0 ? (
          <div className="space-y-2">
            {premiumConversion.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                <p className="text-xs font-semibold text-gray-700 flex-1 capitalize">{item.src}</p>
                <span className="text-xs text-gray-400">{item.visits} visitas</span>
                <span className="text-xs font-bold text-purple-600">{item.purchases} compras</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.rate > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>{item.rate}%</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Sem dados de compra premium com origem UTM ainda." />}
      </Section>

      {/* 7. Activity by Hour */}
      <Section title="🕐 Atividade por Horário" subtitle="Sessões agrupadas por hora do dia">
        {sessionStarts.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={hourData}>
              <XAxis dataKey="hour" tick={{ fontSize: 8 }} interval={2} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2D6A4F" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState text="Sem sessões registradas no período." />}
      </Section>

      {/* 8. Premium Churn */}
      <Section title="📉 Churn Premium" subtitle="Cancelamentos e perda de receita">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Usuários premium ativos" value={uniquePremiumEmails} color="text-amber-600 bg-amber-50" />
          <Metric label="Compras no período" value={premiumPurchases.length} color="text-green-600 bg-green-50" />
        </div>
        <div className="bg-amber-50 rounded-xl p-3 mt-2">
          <p className="text-xs text-amber-700">Para medir churn, adicione eventos com <code className="bg-amber-100 px-1 rounded">subscription_end</code> ao cancelar assinaturas no webhook Hotmart.</p>
        </div>
      </Section>

      {/* 9. Discovery Funnel */}
      <Section title="🔭 Funil de Descoberta" subtitle="Do início até salvar e criar planner">
        <div className="space-y-2">
          {funnelSteps.map((step, i) => {
            const pct = funnelSteps[0].count > 0 ? Math.round((step.count / funnelSteps[0].count) * 100) : 0;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{step.step}</span>
                  <span className="font-bold text-gray-800">{step.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-[#2D6A4F] h-2.5 rounded-full transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
                </div>
                {i < funnelSteps.length - 1 && (
                  <p className="text-[10px] text-gray-400 text-right mt-0.5">
                    conversão: {funnelSteps[i + 1].count > 0 && step.count > 0 ? Math.round((funnelSteps[i + 1].count / step.count) * 100) : 0}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 10. Screen Performance */}
      <Section title="⚡ Performance de Telas" subtitle="Tempo médio de carregamento por tela (ms)">
        {screenPerf.length > 0 ? (
          <div className="space-y-1.5">
            {screenPerf.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <p className="text-xs flex-1 text-gray-700">{s.screen}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.avg > 2000 ? "text-red-600 bg-red-50" : s.avg > 1000 ? "text-orange-600 bg-orange-50" : "text-green-600 bg-green-50"}`}>{s.avg}ms</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Adicione tracking screen_load com load_time_ms e occasion_label=screen_name." />}
      </Section>

      {/* 11. UI Click Heatmap */}
      <Section title="🖱 Heatmap de Cliques" subtitle="Elementos mais clicados no app">
        {topClicks.length > 0 ? (
          <div className="space-y-1.5">
            {topClicks.map(([el, count], i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                <p className="text-xs flex-1 text-gray-700">{el}</p>
                <div className="w-20 bg-gray-100 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.round((count / topClicks[0][1]) * 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-600 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Adicione tracking ui_click com occasion_label=element_name." />}
      </Section>

      {/* 12. Push Analytics */}
      <Section title="🔔 Analytics de Notificações" subtitle="Taxa de abertura das push notifications">
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Metric label="Push enviadas" value={pushSentTotal} />
          <Metric label="Push abertas" value={pushOpened.length} color="text-green-600 bg-green-50" />
          <Metric label="Taxa de abertura" value={`${pushOpenRate}%`} color="text-blue-600 bg-blue-50" />
          <Metric label="Push → Receita" value={pushToRecipe} color="text-purple-600 bg-purple-50" />
        </div>
        {pushSent.length === 0 && <EmptyState text="Adicione tracking push_sent/push_opened/push_recipe_open nos envios." />}
      </Section>

      {/* 13. Retention by Source */}
      <Section title="🔄 Retenção por Origem" subtitle="Quais fontes de tráfego trazem usuários que voltam">
        {retentionBySource.length > 0 ? (
          <div className="space-y-2">
            {retentionBySource.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                <p className="text-xs font-semibold text-gray-700 flex-1 capitalize">{item.src}</p>
                <span className="text-xs text-gray-400">{item.total} usuários</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.rate > 50 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{item.rate}% voltaram</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Sem dados de retenção por fonte UTM ainda." />}
      </Section>

      {/* 14. Recipe → Planner Rate */}
      <Section title="📅 Conversão Receita → Planner" subtitle="Quantos planners foram criados a partir de receitas">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Planners criados" value={plannerCount} color="text-[#2D6A4F] bg-green-50" />
          <Metric label="Taxa receita→planner" value={`${plannerRate}%`} color="text-blue-600 bg-blue-50" />
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mt-2">
          <p className="text-[11px] text-gray-500">Para melhorar esta métrica, adicione <code className="bg-gray-100 px-1 rounded">recipe_id</code> ao evento planner_created.</p>
        </div>
      </Section>
    </div>
  );
}

const PAGE_SIZE = 15;

function SearchAnalyticsSection({ searches, topSearches, noResultSearches, searchClickRate, searchQueries, searchDayData, searchPage, setSearchPage, searchFilter, setSearchFilter }) {
  const filtered = searchFilter.trim()
    ? topSearches.filter(([q]) => q.toLowerCase().includes(searchFilter.toLowerCase()))
    : topSearches;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((searchPage - 1) * PAGE_SIZE, searchPage * PAGE_SIZE);

  const handleFilter = (v) => { setSearchFilter(v); setSearchPage(1); };

  return (
    <Section title="🔍 Search Analytics" subtitle={`${searches.length} buscas — ${Object.keys(searchQueries).length} termos únicos`}>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Metric label="Total buscas" value={searches.length} />
        <Metric label="Taxa clique" value={`${searchClickRate}%`} color="text-green-600 bg-green-50" />
        <Metric label="Sem resultado" value={noResultSearches.reduce((a, [, v]) => a + v.noResults, 0)} color="text-red-600 bg-red-50" />
        <Metric label="Termos únicos" value={Object.keys(searchQueries).length} color="text-blue-600 bg-blue-50" />
      </div>

      {topSearches.length > 0 ? (
        <>
          {/* Search filter input */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar termos..."
              value={searchFilter}
              onChange={e => handleFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-300"
            />
          </div>

          <p className="text-xs font-bold text-gray-500 mb-2">
            Todos os termos buscados ({filtered.length})
          </p>
          <div className="space-y-1.5">
            {paginated.map(([q, d], i) => {
              const globalIdx = (searchPage - 1) * PAGE_SIZE + i + 1;
              const barPct = topSearches[0] ? Math.round((d.count / topSearches[0][1].count) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 w-5 text-right">{globalIdx}</span>
                  <p className="text-xs flex-1 text-gray-700 truncate">{q}</p>
                  <div className="w-16 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                    <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-6 text-right">{d.count}</span>
                  {d.noResults > 0 && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">0 res</span>}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                disabled={searchPage === 1}
                className="flex items-center gap-1 text-xs text-gray-500 disabled:opacity-30 hover:text-purple-600 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <span className="text-xs text-gray-400">{searchPage} / {totalPages}</span>
              <button
                onClick={() => setSearchPage(p => Math.min(totalPages, p + 1))}
                disabled={searchPage === totalPages}
                className="flex items-center gap-1 text-xs text-gray-500 disabled:opacity-30 hover:text-purple-600 transition"
              >
                Próximo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {searchDayData.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500 mb-2">Buscas por dia</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={searchDayData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {noResultSearches.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-red-500 mb-2">⚠️ Termos sem resultado</p>
              <div className="space-y-1">
                {noResultSearches.map(([q, d], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <p className="text-xs flex-1 text-gray-600 truncate">{q}</p>
                    <span className="text-xs text-red-500 font-bold">{d.noResults}x sem resultado</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : <EmptyState text="Adicione tracking de recipe_search no app para ver dados." />}
    </Section>
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

function Metric({ label, value, color = "text-gray-700 bg-gray-50" }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl p-3 ${color.split(" ")[1] || "bg-gray-50"}`}>
      <p className={`text-xl font-bold ${color.split(" ")[0] || "text-gray-700"}`}>{value}</p>
      <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
}