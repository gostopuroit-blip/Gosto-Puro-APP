import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Crown, TrendingUp, UserCheck, UserX, MousePointerClick, ShoppingCart } from "lucide-react";

function fmt(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPremiumIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("nao_comprou");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [analytics, usersRes, pending, webhooks] = await Promise.all([
      base44.entities.AppAnalytics.filter({ event_type: "premium_click" }, "-created_date", 500).catch(() => []),
      base44.functions.invoke("adminGetUsersV2").catch(() => ({ data: [] })),
      base44.entities.PendingPremium.filter({ status: "pending" }, "-created_date", 200).catch(() => []),
      base44.entities.WebhookLog.filter({ source: "Hotmart", status: "success" }, "-created_date", 500).catch(() => []),
    ]);

    const raw = typeof usersRes.data === "string" ? JSON.parse(usersRes.data) : usersRes.data;
    const users = Array.isArray(raw) ? raw : [];

    // Cliques no botão upgrade
    const clicksByEmail = {};
    for (const ev of analytics) {
      const email = ev.user_email || "anônimo";
      if (!clicksByEmail[email]) clicksByEmail[email] = { email, count: 0, last_click: ev.created_date, source: ev.source };
      clicksByEmail[email].count++;
      if (ev.created_date > clicksByEmail[email].last_click) {
        clicksByEmail[email].last_click = ev.created_date;
        clicksByEmail[email].source = ev.source;
      }
    }
    const clicks = Object.values(clicksByEmail).sort((a, b) => b.count - a.count);

    // Clicaram mas NÃO compraram = clicaram e não são premium
    const premiumEmails = new Set(users.filter(u => u.plan === "premium").map(u => u.email));
    const clicouNaoComprou = clicks.filter(c => c.email !== "anônimo" && !premiumEmails.has(c.email));

    // Usuários premium — separar automático (hotmart_product_id preenchido) vs manual
    const premiumUsers = users.filter(u => u.plan === "premium");
    const premiumAuto = premiumUsers.filter(u => u.hotmart_product_id); // veio via webhook
    const premiumManual = premiumUsers.filter(u => !u.hotmart_product_id); // promovido manualmente

    // Comprou na Hotmart (webhook recebido) mas NÃO está no app (pending)
    // Ou: veio webhook mas o usuário não tem registro
    const comprouNaoEntrou = pending;

    setData({ clicks, clicouNaoComprou, premiumAuto, premiumManual, comprouNaoEntrou, totalPremium: premiumUsers.length });
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#2D6A4F]" /></div>;

  const tabs = [
    { key: "nao_comprou", label: "Clicou, não comprou", icon: ShoppingCart, count: data.clicouNaoComprou.length, color: "orange" },
    { key: "clicks", label: "Todos os cliques", icon: MousePointerClick, count: data.clicks.length, color: "blue" },
    { key: "auto", label: "Comprou + Entrou", icon: UserCheck, count: data.premiumAuto.length, color: "green" },
    { key: "manual", label: "Premium Manual", icon: Crown, count: data.premiumManual.length, color: "purple" },
    { key: "nao_entrou", label: "Comprou + Não entrou", icon: UserX, count: data.comprouNaoEntrou.length, color: "red" },
  ];

  const colorMap = {
    orange: { bg: "bg-orange-50", text: "text-orange-700", active: "bg-orange-500 text-white", badge: "bg-orange-100 text-orange-700" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", active: "bg-blue-600 text-white", badge: "bg-blue-100 text-blue-700" },
    green: { bg: "bg-green-50", text: "text-green-700", active: "bg-green-600 text-white", badge: "bg-green-100 text-green-700" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", active: "bg-purple-600 text-white", badge: "bg-purple-100 text-purple-700" },
    red: { bg: "bg-red-50", text: "text-red-700", active: "bg-red-600 text-white", badge: "bg-red-100 text-red-700" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Inteligência Premium</h2>
          <p className="text-[11px] text-gray-400">Quem clicou, comprou, entrou ou não entrou</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        {tabs.map(t => {
          const c = colorMap[t.color];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-2xl p-3 text-left border transition-all ${tab === t.key ? c.active + " border-transparent shadow-md" : "bg-white border-gray-100 hover:border-gray-200"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <t.icon className={`w-4 h-4 ${tab === t.key ? "text-white/80" : c.text}`} />
                <span className={`text-xl font-bold ${tab === t.key ? "text-white" : "text-gray-900"}`}>{t.count}</span>
              </div>
              <p className={`text-[11px] font-semibold ${tab === t.key ? "text-white/80" : "text-gray-500"}`}>{t.label}</p>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-2">

        {/* CLICOU MAS NÃO COMPROU */}
        {tab === "nao_comprou" && (
          <>
            <div className="bg-orange-50 rounded-xl p-3 text-[11px] text-orange-700">
              🛒 Esses usuários clicaram no botão de upgrade mas <strong>ainda não são premium</strong>. Possíveis interessados que abandonaram o checkout.
            </div>
            {data.clicouNaoComprou.length === 0 ? (
              <EmptyState msg="Nenhum abandono registrado. Todos que clicaram compraram!" />
            ) : data.clicouNaoComprou.map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-orange-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.email}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Último clique: {fmt(c.last_click)}</p>
                    {c.source && <p className="text-[10px] text-gray-300">Origem: {c.source}</p>}
                  </div>
                  <span className="bg-orange-100 text-orange-700 text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0">
                    {c.count}x clique{c.count > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* TODOS OS CLIQUES */}
        {tab === "clicks" && (
          <>
            {data.clicks.length === 0 ? (
              <EmptyState msg="Nenhum clique registrado ainda." />
            ) : data.clicks.map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.email}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Última vez: {fmt(c.last_click)}</p>
                    {c.source && <p className="text-[10px] text-gray-300">Origem: {c.source}</p>}
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0">
                    {c.count}x clique{c.count > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* COMPROU + ENTROU (automático via Hotmart) */}
        {tab === "auto" && (
          <>
            <div className="bg-green-50 rounded-xl p-3 text-[11px] text-green-700">
              ✅ Esses usuários compraram na Hotmart e o webhook foi recebido automaticamente.
            </div>
            {data.premiumAuto.length === 0 ? (
              <EmptyState msg="Nenhum ainda." />
            ) : data.premiumAuto.map((u, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <span>👤</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{u.full_name || "—"}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">Produto Hotmart: {u.hotmart_product_id} · Plano: {u.subscription_plan || "—"}</p>
                  </div>
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">Auto</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* PREMIUM MANUAL */}
        {tab === "manual" && (
          <>
            <div className="bg-purple-50 rounded-xl p-3 text-[11px] text-purple-700">
              👑 Esses usuários foram promovidos manualmente pelo admin — sem compra registrada via webhook.
            </div>
            {data.premiumManual.length === 0 ? (
              <EmptyState msg="Nenhum premium manual." />
            ) : data.premiumManual.map((u, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <span>👤</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{u.full_name || "—"}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">Promovido em: {fmt(u.updated_date || u.created_date)}</p>
                  </div>
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full">Manual</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* COMPROU MAS NÃO ENTROU (pending) */}
        {tab === "nao_entrou" && (
          <>
            <div className="bg-red-50 rounded-xl p-3 text-[11px] text-red-700">
              ⚠️ Esses emails compraram na Hotmart (webhook recebido) mas ainda <strong>não criaram conta</strong> no app. Quando entrarem, serão promovidos automaticamente.
            </div>
            {data.comprouNaoEntrou.length === 0 ? (
              <EmptyState msg="Nenhum pendente. Ótimo!" />
            ) : data.comprouNaoEntrou.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-red-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{p.email}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Produto: {p.product_id} · Evento: {p.event_type}</p>
                    <p className="text-[10px] text-gray-300">Registrado em: {fmt(p.created_date)}</p>
                  </div>
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0">Pendente</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
      <p className="text-gray-400 text-sm">{msg}</p>
    </div>
  );
}