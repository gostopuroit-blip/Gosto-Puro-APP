import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, RefreshCw, Eye, MousePointerClick, Lock, Megaphone, Info } from "lucide-react";

// Self-contained: busca o funil via RPC gp_premium_funnel_metrics (não depende de props).
// Eventos reais: premium_page_view, premium_buy_click, premium_click (Sblocca), click+premium_banner.
function nf(n) { return new Intl.NumberFormat("pt-BR").format(Math.round(n || 0)); }
function pct(a, b) { return b ? Math.round((a / b) * 100) + "%" : "0%"; }

export default function AdminPremiumFunnel() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = async () => {
    setLoading(true); setErr(false);
    try {
      const { data, error } = await supabase.rpc("gp_premium_funnel_metrics");
      if (error || !data || data.error) throw error || new Error(data?.error || "no data");
      setM(data);
    } catch { setErr(true); setM(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;
  if (err || !m) return (
    <div className="bg-white rounded-2xl p-6 text-center">
      <p className="text-sm text-gray-500">Não consegui carregar o funil agora.</p>
      <button onClick={load} className="mt-3 text-sm font-semibold text-[#2D6A4F]">Tentar de novo</button>
    </div>
  );

  const daily = Array.isArray(m.daily) ? m.daily : [];
  const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.views || 0, d.buys || 0)));
  const conv = pct(m.buy_users, m.view_users);
  const steps = [
    { label: "Viram a página de venda", value: m.page_views, users: m.view_users, icon: Eye },
    { label: "Clicaram em assinar", value: m.buy_clicks, users: m.buy_users, icon: MousePointerClick },
  ];
  const extras = [
    { label: "Cliques no banner Premium", value: m.banner_clicks, icon: Megaphone },
    { label: "Cliques em 'Sblocca' (coleção)", value: m.sblocca_clicks, icon: Lock },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Funil Premium</h2>
          <p className="text-xs text-gray-500">Página de venda → clique em assinar (contas de teste/admin excluídas)</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Atualizar"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          A gravação de eventos de <b>todos</b> os usuários foi corrigida em 30/06 (antes só ~4 contas de teste).
          Os números crescem conforme as visitas — espere alguns dias para um funil representativo.
          Agora rastreando <b>{nf(m.usuarios_rastreados)}</b> usuários ({nf(m.total_eventos)} eventos).
        </p>
      </div>

      {/* Funil */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="space-y-3">
          {steps.map((s, i) => {
            const widthPct = i === 0 ? 100 : (m.page_views ? Math.max(6, Math.round((s.value / m.page_views) * 100)) : 6);
            return (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-700"><s.icon className="w-4 h-4 text-[#2D6A4F]" /> {s.label}</span>
                  <span className="text-sm text-gray-500"><b className="text-gray-900">{nf(s.value)}</b> · {nf(s.users)} pessoas</span>
                </div>
                <div className="w-full h-7 bg-gray-100 rounded-lg overflow-hidden">
                  <div className="h-full bg-[#2D6A4F] rounded-lg flex items-center justify-end pr-2 min-w-[34px]" style={{ width: `${widthPct}%` }}>
                    <span className="text-[11px] font-bold text-white">{widthPct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Conversão (clicou assinar ÷ viu a página)</span>
          <span className="text-2xl font-bold text-[#2D6A4F]">{conv}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {extras.map((e) => (
          <div key={e.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-[#2D6A4F]"><e.icon className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{e.label}</span></div>
            <p className="text-2xl font-bold text-gray-900 mt-1.5">{nf(e.value)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Por dia (últimos 14 dias)</h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#2D6A4F] inline-block" /> Viram</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#D4A846] inline-block" /> Assinar</span>
          </div>
        </div>
        {daily.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Sem dados ainda — aparece quando os usuários visitarem a página de venda.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div className="w-1/2 bg-[#2D6A4F] rounded-t" style={{ height: `${Math.max(2, ((d.views || 0) / maxDaily) * 100)}%` }} title={`${d.day}: ${d.views} viram`} />
                  <div className="w-1/2 bg-[#D4A846] rounded-t" style={{ height: `${Math.max(2, ((d.buys || 0) / maxDaily) * 100)}%` }} title={`${d.day}: ${d.buys} assinar`} />
                </div>
                <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.day}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
