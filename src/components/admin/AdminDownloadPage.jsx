import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, RefreshCw, Eye, Download, Smartphone, UserPlus, CheckCircle2, Info } from "lucide-react";

function nf(n) { return new Intl.NumberFormat("pt-BR").format(Math.round(n || 0)); }
const PLAT_LABEL = { android: "Android", ios: "iPhone", desktop: "Desktop", "?": "Outro" };

export default function AdminDownloadPage() {
  const [m, setM] = useState(null);
  const [sources, setSources] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = async () => {
    setLoading(true); setErr(false);
    try {
      const [dl, sr, fn] = await Promise.all([
        supabase.rpc("gp_download_metrics"),
        supabase.rpc("gp_signup_sources"),
        supabase.rpc("gp_acquisition_funnel"),
      ]);
      if (dl.error || !dl.data) throw dl.error || new Error("no data");
      setM(dl.data);
      setSources(sr.data || null);
      setFunnel(fn.data || null);
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
  const installedPlat = m.installed_by_platform || {};
  const installedTotal = m.installed_total || 0;
  const convRate = m.views_total ? Math.round((m.installs_total / m.views_total) * 100) : 0;
  const bySource = Array.isArray(m.by_source) ? m.by_source : [];
  const maxSrc = Math.max(1, ...bySource.map((s) => s.views || 0));
  const SRC_LABEL = {
    instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", whatsapp: "WhatsApp",
    youtube: "YouTube", twitter: "X / Twitter", google: "Google", pinterest: "Pinterest",
    snapchat: "Snapchat", line: "Line", direct: "Direto / desconhecido",
  };
  const accSources = Array.isArray(sources?.by_source) ? sources.by_source : [];
  const maxAcc = Math.max(1, ...accSources.map((s) => s.total || 0));
  const today = funnel?.today || null;
  const convFree = today && today.visits ? Math.round((today.new_free / today.visits) * 100) : 0;

  const cards = [
    { label: "Visitas (total)", value: m.views_total, sub: `${nf(m.views_14d)} nos últimos 14 dias`, icon: Eye },
    { label: "Clicaram em instalar", value: m.installs_total, sub: `${nf(m.installs_14d)} nos últimos 14 dias`, icon: Download },
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

      {/* Como ler estes números — evita confundir clique com instalação real */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-amber-900">Como ler estes números</h3>
        </div>
        <p className="text-[12px] text-amber-900/80 leading-relaxed">
          O caminho é: <b>Visita</b> → <b>clicou em instalar</b> → <b>instalou de fato</b> → <b>criou conta</b>.
          Cada passo perde gente — é normal. O que importa é entender <i>onde</i> perde:
        </p>
        <ul className="mt-2 space-y-1.5 text-[12px] text-amber-900/80">
          <li>👁️ <b>Visita</b> = abriu a página /download.</li>
          <li>👆 <b>Clicou em instalar</b> = tocou no botão. <b>Não</b> quer dizer que instalou.</li>
          <li>✅ <b>Instalou de fato</b> = instalação confirmada (Android/desktop). No <b>iPhone não dá pra medir</b> — a Apple não avisa o app quando a pessoa adiciona à tela.</li>
        </ul>
        <p className="mt-2 text-[12px] text-amber-900/80 leading-relaxed">
          <b>Por que muita gente clica mas não instala:</b> a maioria vem do <b>Instagram</b>, que abre a página no navegador interno dele — e ali <b>não dá pra instalar PWA</b>. A pessoa clica, o app pede pra abrir no Chrome/Safari, e boa parte desiste nesse passo. No <b>iPhone</b> a instalação é manual (Condividi → Aggiungi a schermata Home), o que também derruba o número.
        </p>
      </div>

      {/* Funil de hoje: visita → instalar → conta grátis */}
      {today && (
        <div className="bg-gradient-to-br from-[#2D6A4F] to-[#235c43] rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold">Funil de hoje</p>
            <span className="text-[11px] text-white/60">visita → clicou → conta grátis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 rounded-xl p-3 text-center bg-white/10">
              <Eye className="w-4 h-4 mx-auto mb-1 text-white/80" />
              <p className="text-2xl font-bold leading-none">{nf(today.visits)}</p>
              <p className="text-[10px] mt-1 text-white/70">Visitas</p>
            </div>
            <span className="text-white/40 font-bold">→</span>
            <div className="flex-1 rounded-xl p-3 text-center bg-white/10">
              <Download className="w-4 h-4 mx-auto mb-1 text-white/80" />
              <p className="text-2xl font-bold leading-none">{nf(today.installs)}</p>
              <p className="text-[10px] mt-1 text-white/70">Clicou instalar</p>
            </div>
            <span className="text-white/40 font-bold">→</span>
            <div className="flex-1 rounded-xl p-3 text-center bg-[#D4A846] text-[#412402]">
              <UserPlus className="w-4 h-4 mx-auto mb-1" />
              <p className="text-2xl font-bold leading-none">{nf(today.new_free)}</p>
              <p className="text-[10px] mt-1 text-[#412402]/80">Contas grátis</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-white/80">
            <span>Conversão visita → conta grátis: <b className="text-white">{convFree}%</b></span>
            <span>{nf(today.new_accounts)} contas hoje · {nf(today.new_paid)} pagantes</span>
          </div>
          <p className="text-[10px] text-white/45 mt-2 leading-relaxed">
            Correlação por dia (instalar é anônimo). A atribuição exata por origem vai aparecendo em "Contas criadas por origem".
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-[#2D6A4F]"><c.icon className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</span></div>
            <p className="text-3xl font-bold text-gray-900 mt-1.5">{nf(c.value)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Instalou de fato (instalação confirmada, Android/desktop) */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 text-[#2D6A4F]"><CheckCircle2 className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Instalou de fato</span></div>
        <p className="text-3xl font-bold text-gray-900 mt-1.5">{nf(installedTotal)}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Confirmado em Android/desktop · {nf(m.installed_14d)} em 14 dias. iPhone não é mensurável (limite da Apple). Começou a contar agora.
        </p>
      </div>

      {/* Conversão */}
      <div className="bg-[#2D6A4F] rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Conversão</p>
          <p className="text-xs text-white/75">clicaram em instalar ÷ visitas</p>
        </div>
        <p className="text-3xl font-bold">{convRate}%</p>
      </div>

      {/* Por plataforma */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4 text-[#2D6A4F]" /><h3 className="text-sm font-bold text-gray-800">Por dispositivo</h3></div>
        {Object.keys(platforms).length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Sem dados ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {["android", "ios", "desktop"].map((k) => (
              <div key={k} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{nf(platforms[k] || 0)}</p>
                <p className="text-[11px] text-gray-500">{PLAT_LABEL[k]}</p>
                <p className="text-[10px] text-[#2D6A4F] mt-1 font-medium">
                  {k === "ios" ? "instalar não medível" : `${nf(installedPlat[k] || 0)} instalou`}
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          Número grande = <b>clicaram em instalar</b>. Embaixo, em verde, a <b>instalação confirmada</b> (só Android/desktop; no iPhone a Apple não avisa).
        </p>
      </div>

      {/* De onde vêm (origem) */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">De onde vêm as visitas</h3>
        {bySource.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Sem dados ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {bySource.map((s) => (
              <div key={s.source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{SRC_LABEL[s.source] || s.source}</span>
                  <span className="text-xs text-gray-500">
                    <b className="text-gray-900">{nf(s.views)}</b> visitas · {nf(s.installs)} clicaram
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2D6A4F] rounded-full" style={{ width: `${Math.max(3, ((s.views || 0) / maxSrc) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          Detecta pela tag do link (?utm_source=…), pelo app interno (Instagram/TikTok) e pelo referrer. Marque seus links (ex.: /download?utm_source=instagram) para máxima precisão.
        </p>
      </div>

      {/* Contas criadas por origem (funil real: virou usuário) */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Contas criadas por origem</h3>
        <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
          De onde vieram as pessoas que <b>criaram conta</b> (não só visitaram). Começa a contar agora — contas antigas não têm origem registrada.
        </p>
        {accSources.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Ainda sem contas novas atribuídas. Os números aparecem conforme novas pessoas se cadastram.</p>
        ) : (
          <div className="space-y-2.5">
            {accSources.map((s) => (
              <div key={s.source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{SRC_LABEL[s.source] || s.source}</span>
                  <span className="text-xs text-gray-500">
                    <b className="text-gray-900">{nf(s.total)}</b> contas · {nf(s.free)} grátis
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D4A846] rounded-full" style={{ width: `${Math.max(3, ((s.total || 0) / maxAcc) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {sources && (
          <p className="text-[11px] text-gray-400 mt-3">
            Últimos 7 dias: <b className="text-gray-700">{nf(sources.new_7d)}</b> contas novas · <b className="text-gray-700">{nf(sources.new_free_7d)}</b> grátis.
          </p>
        )}
      </div>

      {/* Por dia */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Por dia (14 dias)</h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#2D6A4F] inline-block" /> Visitas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#D4A846] inline-block" /> Clicaram</span>
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
