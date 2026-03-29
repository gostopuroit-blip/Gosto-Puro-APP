import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Send, BookOpen, CheckCircle, Clock, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";

function fmt(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function AdminEbookFollowup() {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState("all");
  const [productId, setProductId] = useState("");
  const [productIdRecord, setProductIdRecord] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [data, configs] = await Promise.all([
      base44.entities.EbookPurchaseTrigger.list("-purchase_approved_at", 200).catch(() => []),
      base44.entities.AppConfig.filter({ key: "ebook_product_id" }, "-created_date", 1).catch(() => []),
    ]);
    setTriggers(data);
    if (configs && configs.length > 0) {
      setProductIdRecord(configs[0]);
      setProductId(configs[0].value || "");
    }
    setLoading(false);
  };

  const saveProductId = async () => {
    if (!productId.trim()) { toast.error("Digite o ID do produto"); return; }
    setSavingConfig(true);
    try {
      if (productIdRecord) {
        await base44.entities.AppConfig.update(productIdRecord.id, { value: productId.trim() });
      } else {
        const rec = await base44.entities.AppConfig.create({ key: "ebook_product_id", value: productId.trim(), label: "ID do produto e-book na Hotmart" });
        setProductIdRecord(rec);
      }
      toast.success("✅ ID do produto salvo!");
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
    setSavingConfig(false);
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("ebookFollowupSender");
      const d = res.data;
      toast.success(`✅ ${d.sent} emails enviados${d.failed > 0 ? `, ${d.failed} falhas` : ""}`);
      await load();
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
    setRunning(false);
  };

  const [sendingTest, setSendingTest] = useState(false);
  const sendTest = async () => {
    setSendingTest(true);
    try {
      await base44.functions.invoke("ebookFollowupTest", { to_email: "fernandesbrandom@gmail.com", user_name: "Brandon" });
      toast.success("✅ Email de teste enviado para fernandesbrandom@gmail.com!");
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
    setSendingTest(false);
  };

  const now = new Date();
  const filtered = triggers.filter(t => {
    if (filter === "pending") return !t.followup_email_sent;
    if (filter === "sent") return t.followup_email_sent;
    return true;
  });

  const totalSent = triggers.filter(t => t.followup_email_sent).length;
  const totalPending = triggers.filter(t => !t.followup_email_sent).length;
  const totalDue = triggers.filter(t => !t.followup_email_sent && t.email_trigger_at && new Date(t.email_trigger_at) <= now).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#2D6A4F]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-4 h-4" /> E-book Followup</h2>
          <p className="text-[11px] text-gray-400">Email automático 48h após compra do e-book na Hotmart</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={sendTest}
            disabled={sendingTest}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar teste
          </button>
          <button
            onClick={runNow}
            disabled={running || totalDue === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#2D6A4F] text-white rounded-xl text-xs font-semibold hover:bg-[#245a42] transition-all disabled:opacity-50"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Disparar agora{totalDue > 0 ? ` (${totalDue})` : ""}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-900">{triggers.length}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Compras registradas</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{totalSent}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Emails enviados</p>
        </div>
        <div className={`rounded-2xl p-4 text-center ${totalDue > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
          <p className={`text-2xl font-bold ${totalDue > 0 ? "text-amber-700" : "text-gray-500"}`}>{totalPending}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Pendentes{totalDue > 0 ? ` (${totalDue} prontos)` : ""}</p>
        </div>
      </div>

      {/* Config: ID do produto */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <div>
          <p className="text-sm font-bold text-gray-800">⚙️ ID do produto e-book (Hotmart)</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Cole aqui o ID do produto e-book que aparece no painel da Hotmart (ex: 1234567)</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={productId}
            onChange={e => setProductId(e.target.value)}
            placeholder="Ex: 1234567"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20"
          />
          <button
            onClick={saveProductId}
            disabled={savingConfig}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2D6A4F] text-white rounded-xl text-sm font-semibold hover:bg-[#245a42] transition-all disabled:opacity-50"
          >
            {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
        {productIdRecord && (
          <p className="text-[11px] text-green-600">✅ Produto configurado: <strong>{productId}</strong></p>
        )}
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-[11px] text-amber-700">Crie também um Email Template com o nome exato <strong>"Ebook Followup"</strong> na aba Email Templates. Use <code className="bg-amber-100 px-1 rounded">{'{{USER_NAME}}'}</code> e <code className="bg-amber-100 px-1 rounded">{'{{USER_EMAIL}}'}</code>.</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[["all", "Todos"], ["pending", "Pendentes"], ["sent", "Enviados"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filter === v ? "bg-white text-[#2D6A4F] shadow-sm" : "text-gray-500"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <p className="text-gray-400 text-sm">Nenhuma compra de e-book registrada ainda.</p>
            <p className="text-[11px] text-gray-300 mt-1">As compras aparecerão aqui quando a Hotmart enviar os webhooks.</p>
          </div>
        ) : (
          filtered.map((t) => {
            const isDue = !t.followup_email_sent && t.email_trigger_at && new Date(t.email_trigger_at) <= now;
            const isScheduled = !t.followup_email_sent && t.email_trigger_at && new Date(t.email_trigger_at) > now;
            return (
              <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{t.user_name || "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{t.user_email}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">Produto: {t.hotmart_product_id} · TX: {t.hotmart_transaction_id}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {t.followup_email_sent ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Enviado
                      </span>
                    ) : isDue ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Pronto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> Agendado
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-[9px] text-gray-300 uppercase tracking-wide">Compra aprovada</p>
                    <p className="text-[11px] text-gray-600">{fmt(t.purchase_approved_at)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-300 uppercase tracking-wide">Disparo agendado</p>
                    <p className={`text-[11px] font-semibold ${isDue ? "text-amber-600" : "text-gray-600"}`}>{fmt(t.email_trigger_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}