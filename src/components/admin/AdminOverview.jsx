import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, RefreshCw, Copy, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

// Link do "dashboard mãe" — página pública protegida por token.
// O token bate com METRICS_API_TOKEN (ou o fallback) da Edge Function metrics-api.
const METRICS_TOKEN = "gp_metrics_2026_xK9mPq7wYv3nLz";
const METRICS_BASE = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/metrics-api`;
const METRICS_LINK = `${METRICS_BASE}?key=${METRICS_TOKEN}`;

function nf(n) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));
}
function pct(a, b) {
  if (!b) return "0%";
  return Math.round((a / b) * 100) + "%";
}
function dur(s) {
  s = Math.round(s || 0);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}min ${r}s` : `${m}min`;
}

export default function AdminOverview() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("gp_dashboard_metrics");
      if (error) throw error;
      setM(data);
    } catch {
      setM(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(METRICS_LINK);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não consegui copiar — copie manualmente");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>;
  if (!m) return (
    <div className="bg-white rounded-2xl p-6 text-center">
      <p className="text-sm text-gray-500">Não consegui carregar os números agora.</p>
      <button onClick={load} className="mt-3 text-sm font-semibold text-[#2D6A4F]">Tentar de novo</button>
    </div>
  );

  const p = m.people, a = m.activity, e = m.engagement_7d;

  return (
    <div className="space-y-5">
      {/* Frase-resumo (linguagem simples) */}
      <div className="bg-gradient-to-br from-[#2D6A4F] to-[#40916C] rounded-2xl p-5 text-white shadow-lg">
        <p className="text-sm leading-relaxed">
          📊 <b>Hoje</b> entraram <b>{nf(p.new_today)}</b> pessoas novas e <b>{nf(a.active_today)}</b> usaram o app.
          No total são <b>{nf(p.total)}</b> pessoas, sendo <b>{nf(p.with_access)}</b> com acesso pago
          ({pct(p.with_access, p.total)}). Temos <b>{nf(m.catalog.total_recipes)}</b> receitas no catálogo.
        </p>
        <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 rounded-lg px-2.5 py-1.5">
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>

      {/* Link do dashboard mãe */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
        <p className="text-sm font-bold text-gray-800 mb-1">🔗 Link do Painel Geral (dashboard mãe)</p>
        <p className="text-[11px] text-gray-400 mb-3">Um link único com TODOS os números. Abra no navegador ou compartilhe — qualquer pessoa entende. Não precisa de senha do app, só o link.</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 mb-2">
          <code className="flex-1 text-[10px] text-gray-500 truncate">{METRICS_LINK}</code>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-1.5 bg-[#2D6A4F] text-white rounded-xl py-2.5 text-sm font-semibold active:scale-[0.98] transition-transform">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar link"}
          </button>
          <a href={METRICS_LINK} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-semibold">
            <ExternalLink className="w-4 h-4" /> Abrir
          </a>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">💡 Para planilha/Looker, use o mesmo link com <code className="bg-gray-100 px-1 rounded">&format=json</code> no final.</p>
      </div>

      {/* Pessoas */}
      <Group title="👥 Pessoas">
        <Card emoji="🧑‍🤝‍🧑" value={nf(p.total)} label="Pessoas no total" hint="todas as contas" />
        <Card emoji="💎" value={nf(p.with_access)} label="Com acesso pago" hint={`${pct(p.with_access, p.total)} do total`} />
        <Card emoji="🆓" value={nf(p.free_only)} label="Só grátis" hint="ainda não compraram" />
        <Card emoji="🛒" value={nf(p.with_purchase)} label="Já compraram" hint="1+ produto" />
        <Card emoji="✨" value={nf(p.new_7d)} label="Novas (7 dias)" hint={`${nf(p.new_today)} hoje`} />
        <Card emoji="📅" value={nf(p.new_30d)} label="Novas (30 dias)" hint="último mês" />
      </Group>

      {/* Uso */}
      <Group title="📲 Uso do app">
        <Card emoji="🟢" value={nf(a.online_now)} label="Online agora" hint="últimos 5 min" />
        <Card emoji="☀️" value={nf(a.active_today)} label="Usaram hoje" hint={`${nf(a.sessions_today)} aberturas`} />
        <Card emoji="📈" value={nf(a.active_7d)} label="Usaram (7 dias)" hint={`${nf(a.sessions_7d)} aberturas`} />
        <Card emoji="🗓️" value={nf(a.active_30d)} label="Usaram (30 dias)" hint="último mês" />
        <Card emoji="⏱️" value={dur(e.avg_session_seconds)} label="Tempo médio" hint="por visita (7d)" />
        <Card emoji="📱" value={nf(m.pwa.installed_users)} label="Instalaram o app" />
      </Group>

      {/* Engajamento */}
      <Group title="🔥 Engajamento (7 dias)">
        <Card emoji="👀" value={nf(e.recipe_views)} label="Receitas abertas" />
        <Card emoji="❤️" value={nf(e.recipe_saves)} label="Receitas salvas" />
        <Card emoji="🔎" value={nf(e.searches)} label="Buscas feitas" />
        <Card emoji="💳" value={nf(e.premium_clicks)} label="Cliques em Premium" hint="interesse em comprar" />
        <Card emoji="🍽️" value={nf(e.occasion_clicks)} label="Cliques em ocasiões" />
      </Group>

      {/* Rankings */}
      <RankBlock title="📱 Telas mais visitadas (7d)" rows={(m.top_screens || []).map(s => [s.name, nf(s.views)])} empty="Sem dados ainda" />
      <RankBlock title="🍽️ Ocasiões mais clicadas (7d)" rows={(m.top_occasions || []).map(s => [s.label, nf(s.clicks)])} empty="Sem cliques ainda" />
      <RankBlock title="👀 Receitas mais abertas (30d)" rows={(m.top_recipes_viewed || []).map(s => [s.title, nf(s.n)])} empty="Sem visualizações ainda" />
      <RankBlock title="❤️ Receitas mais salvas (sempre)" rows={(m.top_recipes_saved || []).map(s => [s.title, nf(s.n)])} empty="Sem dados ainda" />
      <RankBlock title="🔗 De onde vêm os visitantes (30d)" rows={(m.traffic_sources || []).map(s => [s.source, `${nf(s.visits)} visitas`])} empty="Nenhum link rastreado ainda" />
      <RankBlock title="👆 Botões mais clicados (7d)" rows={(m.clicks_7d || []).map(s => [s.target, nf(s.n)])} empty="Coleta de cliques recém ativada — aparecerá em breve" />
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-700 mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Card({ emoji, value, label, hint }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
      <div className="text-xl mb-1">{emoji}</div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function RankBlock({ title, rows, empty }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
      <p className="text-sm font-bold text-gray-800 mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(([name, val], i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
              <p className="flex-1 min-w-0 text-xs text-gray-700 truncate">{name}</p>
              <span className="text-xs font-bold text-[#2D6A4F]">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
