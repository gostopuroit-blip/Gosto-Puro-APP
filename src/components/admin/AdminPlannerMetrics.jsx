import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, RefreshCw, CalendarDays, Users, Zap, Clock } from "lucide-react";

function nf(n) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));
}
function pct(a, b) {
  if (!b) return "0%";
  return Math.round((a / b) * 100) + "%";
}

const DURATION_LABELS = { 7: "Semanal (7 dias)", 15: "Quinzenal (15 dias)", 30: "Mensal (30 dias)" };

export default function AdminPlannerMetrics() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(false);
    try {
      const { data, error } = await supabase.rpc("gp_planner_metrics");
      if (error || !data || data.error) throw error || new Error(data?.error || "no data");
      setM(data);
    } catch {
      setErr(true);
      setM(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>;
  if (err || !m) return (
    <div className="bg-white rounded-2xl p-6 text-center">
      <p className="text-sm text-gray-500">Não consegui carregar as métricas do Planner agora.</p>
      <button onClick={load} className="mt-3 text-sm font-semibold text-[#2D6A4F]">Tentar de novo</button>
    </div>
  );

  const daily = Array.isArray(m.daily) ? m.daily : [];
  const byDays = Array.isArray(m.by_days) ? m.by_days : [];
  const maxDaily = Math.max(1, ...daily.map((d) => d.count || 0));
  const totalByDays = byDays.reduce((s, d) => s + (d.count || 0), 0);

  const cards = [
    { label: "Usuários no Planner", value: nf(m.distinct_users), icon: Users, hint: "que já criaram um plano" },
    { label: "Planos criados", value: nf(m.total_plans), icon: CalendarDays, hint: "no total" },
    { label: "Usuários (7 dias)", value: nf(m.last_7d_plans ? m.last_7d_users || 0 : 0) , icon: Zap, hint: `${nf(m.last_7d_plans)} planos na semana` },
    { label: "Planos (24h)", value: nf(m.last_24h_plans), icon: Clock, hint: "últimas 24 horas" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Métricas do Planner</h2>
          <p className="text-xs text-gray-500">Uso real (conta de teste excluída)</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Atualizar">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-[#2D6A4F]">
              <c.icon className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1.5">{c.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Por duração */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Duração escolhida</h3>
        <div className="space-y-2.5">
          {byDays.map((d) => (
            <div key={d.days}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700">{DURATION_LABELS[d.days] || `${d.days} dias`}</span>
                <span className="text-gray-500">{nf(d.count)} · {pct(d.count, totalByDays)}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#2D6A4F] rounded-full" style={{ width: pct(d.count, totalByDays) }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tendência diária (14 dias) */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Planos por dia (últimos 14 dias)</h3>
        <div className="flex items-end gap-1.5 h-40">
          {daily.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
              <span className="text-[10px] font-bold text-gray-600">{d.count}</span>
              <div
                className="w-full bg-[#2D6A4F] rounded-t-md transition-all"
                style={{ height: `${Math.max(4, ((d.count || 0) / maxDaily) * 100)}%` }}
                title={`${d.day}: ${d.count}`}
              />
              <span className="text-[9px] text-gray-400 rotate-0 truncate w-full text-center">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
