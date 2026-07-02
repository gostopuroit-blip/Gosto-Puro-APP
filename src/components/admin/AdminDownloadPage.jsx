import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, RefreshCw, Eye, Download, Smartphone } from "lucide-react";

function nf(n) { return new Intl.NumberFormat("pt-BR").format(Math.round(n || 0)); }
const PLAT_LABEL = { android: "Android", ios: "iPhone", desktop: "Desktop", "?": "Outro" };

export default function AdminDownloadPage() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = async () => {
    setLoading(true); setErr(false);
    try {
      const { data, error } = await supabase.rpc("gp_download_metrics");
      if (error || !data) throw error || new Error("no data");
      setM(data);
    } catch { setErr(true); setM(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;
  if (err || !m) return (
    <div className="bg-white rounded-2xl p-6 text-center">
      <p className="text-sm text-gray-500">Não consegui carregar as métricas.</p>
      <button onClick={load} className="mt-3 text-sm font-semibold text-[#2D6A4F]">Tentar de novo</button>
    </div>
  );

  const daily = Array.isArray(m.daily) ? m.daily : [];
  const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.views || 0, d.installs || 0)));
  const platforms = m.installs_by_platform || {};
  const convRate = m.views_total ? Math.round((m.installs_total / m.views_total) * 100) : 0;

  const cards = [
    { label: "Visitas (total)", value: m.views_total, sub: `${nf(m.views_14d)} nos últimos 14 dias`, icon: Eye },
    { label: "Cliques em instalar", value: m.installs_total, sub: `${nf(m.installs_14d)} nos últimos 14 dias`, icon: Download },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Página /download</h2>
          <p className="text-xs text-gray-500">Visitas e cliques de instalação da landing do app</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Atualizar"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-[#2D6A4F]"><c.icon className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</span></div>
            <p className="text-3xl font-bold text-gray-900 mt-1.5">{nf(c.value)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Conversão */}
      <div className="bg-[#2D6A4F] rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Conversão</p>
          <p className="text-xs text-white/75">cliques em instalar ÷ visitas</p>
        </div>
        <p className="text-3xl font-bold">{convRate}%</p>
      </div>

      {/* Por plataforma */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4 text-[#2D6A4F]" /><h3 className="text-sm font-bold text-gray-800">Instalações por dispositivo</h3></div>
        {Object.keys(platforms).length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Sem dados ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {["android", "ios", "desktop"].map((k) => (
              <div key={k} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{nf(platforms[k] || 0)}</p>
                <p className="text-[11px] text-gray-500">{PLAT_LABEL[k]}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Por dia */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Por dia (14 dias)</h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#2D6A4F] inline-block" /> Visitas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#D4A846] inline-block" /> Instalar</span>
          </div>
        </div>
        {daily.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Sem dados ainda.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div className="w-1/2 bg-[#2D6A4F] rounded-t" style={{ height: `${Math.max(2, ((d.views || 0) / maxDaily) * 100)}%` }} title={`${d.day}: ${d.views} visitas`} />
                  <div className="w-1/2 bg-[#D4A846] rounded-t" style={{ height: `${Math.max(2, ((d.installs || 0) / maxDaily) * 100)}%` }} title={`${d.day}: ${d.installs} instalar`} />
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
