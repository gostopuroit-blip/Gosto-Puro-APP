import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";
import { Bell, Send, Loader2, Users, BellRing, Eye, MousePointerClick, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SEGMENTS = [
  { key: "all", label: "Tutti", desc: "todos" },
  { key: "free", label: "Free", desc: "sem compra" },
  { key: "pagante", label: "Pagantes", desc: "1-2 produtos" },
  { key: "premium", label: "Premium", desc: "acesso total" },
];

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [segment, setSegment] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [breakdown, setBreakdown] = useState(null); // { free, pagante, premium, sem_conta, total }
  const [loadingBd, setLoadingBd] = useState(true);
  const [metrics, setMetrics] = useState(null); // gp_notif_metrics (adoção + funil do convite)

  const loadBreakdown = async () => {
    setLoadingBd(true);
    const res = await base44.functions.invoke("sendCustomNotification", { dryRun: true });
    const b = res.data?.breakdown;
    if (b) setBreakdown({ ...b, total: res.data.total || 0 });
    setLoadingBd(false);
  };
  const loadMetrics = async () => {
    try {
      const { data } = await supabase.rpc("gp_notif_metrics");
      if (data) setMetrics(data);
    } catch { /* silencioso */ }
  };
  useEffect(() => { loadBreakdown(); loadMetrics(); }, []);

  const adoptionPct = metrics && metrics.users_total
    ? Math.round((metrics.subs_total / metrics.users_total) * 100)
    : 0;
  const nudgeConvPct = metrics && metrics.nudge_shown_30d
    ? Math.round((metrics.enabled_via_nudge_30d / metrics.nudge_shown_30d) * 100)
    : 0;

  const countFor = (key) => {
    if (!breakdown) return null;
    if (key === "all") return breakdown.total;
    return breakdown[key] ?? 0;
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Título e mensagem são obrigatórios");
      return;
    }
    const n = countFor(segment);
    const segLabel = SEGMENTS.find((s) => s.key === segment)?.label || "";
    if (n === 0) { toast.error(`Ninguém no segmento "${segLabel}" ligou as notificações`); return; }
    if (!window.confirm(`Enviar para ${n ?? "?"} usuário(s) do segmento "${segLabel}"?`)) return;

    setSending(true);
    setResult(null);
    const res = await base44.functions.invoke("sendCustomNotification", { title, body, url, segment });
    setSending(false);
    if (res.data?.success) {
      setResult(res.data);
      toast.success(`Notificação enviada para ${res.data.sent} usuários!`);
      setTitle(""); setBody(""); setUrl("");
    } else {
      toast.error("Erro ao enviar a notificação");
    }
  };

  return (
    <div className="space-y-4">
      {/* Adoção das notificações (% da base) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <BellRing className="w-5 h-5 text-[#2D6A4F]" />
          <p className="font-bold text-gray-800">Adoção das notificações</p>
        </div>
        {!metrics ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" /></div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.subs_total}
                  <span className="text-base font-medium text-gray-400"> / {metrics.users_total}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">usuários com push ligado</p>
              </div>
              <p className="text-3xl font-bold text-[#2D6A4F]">{adoptionPct}%</p>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-[#2D6A4F] rounded-full" style={{ width: `${Math.max(2, adoptionPct)}%` }} />
            </div>
          </>
        )}
      </div>

      {/* Funil do convite (modal global) — últimos 30 dias */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-[#2D6A4F]" />
          <p className="font-bold text-gray-800">Convite pra ativar · funil (30 dias)</p>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">Quantos viram o modal, tocaram em "Attiva" e ativaram de fato.</p>
        {!metrics ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Viram", v: metrics.nudge_shown_30d, icon: Eye },
                { l: "Tocaram", v: metrics.nudge_clicked_30d, icon: MousePointerClick },
                { l: "Ativaram", v: metrics.enabled_via_nudge_30d, icon: CheckCircle2 },
              ].map((c) => (
                <div key={c.l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <c.icon className="w-4 h-4 text-[#2D6A4F] mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-900">{c.v ?? 0}</p>
                  <p className="text-[11px] text-gray-500">{c.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between bg-[#2D6A4F]/5 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-gray-600">Conversão do convite</p>
              <p className="text-lg font-bold text-[#2D6A4F]">{nudgeConvPct}%</p>
            </div>
            {metrics.enabled_30d > metrics.enabled_via_nudge_30d && (
              <p className="text-[11px] text-gray-400 mt-2">
                +{metrics.enabled_30d - metrics.enabled_via_nudge_30d} ativaram por outros caminhos (Profilo, etc.) nos últimos 30 dias.
              </p>
            )}
            {metrics.nudge_shown_30d === 0 && (
              <p className="text-[11px] text-gray-400 mt-2">Ainda sem dados — os números começam a aparecer conforme os usuários abrem o app.</p>
            )}
          </>
        )}
      </div>

      {/* Quem ligou as notificações (por segmento) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-[#2D6A4F]" />
          <p className="font-bold text-gray-800">Quem ligou as notificações</p>
        </div>
        {loadingBd ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Total", v: breakdown?.total },
              { l: "Free", v: breakdown?.free },
              { l: "Pagantes", v: breakdown?.pagante },
              { l: "Premium", v: breakdown?.premium },
            ].map((c) => (
              <div key={c.l} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{c.v ?? 0}</p>
                <p className="text-[11px] text-gray-500">{c.l}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enviar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-[#2D6A4F]" />
          <p className="font-bold text-gray-800">Enviar Notificação Push</p>
        </div>

        {/* Segmento alvo */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Enviar para</label>
          <div className="grid grid-cols-4 gap-2">
            {SEGMENTS.map((s) => {
              const n = countFor(s.key);
              const active = segment === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSegment(s.key)}
                  className={`py-2 px-1 rounded-xl text-center transition-all border ${
                    active ? "bg-[#2D6A4F] border-[#2D6A4F] text-white" : "bg-white border-gray-200 text-gray-700"
                  }`}
                >
                  <span className="block text-sm font-bold">{s.label}</span>
                  <span className={`block text-[11px] ${active ? "text-white/80" : "text-gray-400"}`}>
                    {n ?? "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Título *</label>
          <input
            type="text"
            placeholder="ex. 🍽️ Novas receitas hoje!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Mensagem *</label>
          <textarea
            placeholder="ex. Descubra as 3 receitas do dia..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Link (opcional)</label>
          <input
            type="text"
            placeholder="ex. /Recipes"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20"
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending
            ? "Enviando..."
            : `Enviar para ${SEGMENTS.find((s) => s.key === segment)?.label}${countFor(segment) != null ? ` (${countFor(segment)})` : ""}`}
        </Button>
      </div>

      {result && (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-sm font-bold text-green-700 mb-1">✓ Notificação enviada</p>
          <p className="text-xs text-green-600">Enviadas: {result.sent} · Falhas: {result.failed} · Removidas: {result.removed}</p>
        </div>
      )}
    </div>
  );
}
