import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";

const sourceOptions = ["Tutti", "Hotmart", "Brevo", "Stripe", "Altro"];
const rangeOptions = ["24h", "7gg", "30gg"];

export default function AdminWebhooks() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("Tutti");
  const [range, setRange] = useState("7gg");
  const [statusFilter, setStatusFilter] = useState("Tutti");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.WebhookLog.list("-created_date", 200);
    setLogs(data);
    setLoading(false);
  };

  const rangeMs = { "24h": 86400000, "7gg": 604800000, "30gg": 2592000000 };

  const filtered = logs.filter((l) => {
    const ts = new Date(l.timestamp || l.created_date).getTime();
    const inRange = ts > Date.now() - (rangeMs[range] || rangeMs["7gg"]);
    const matchSource = source === "Tutti" || l.source === source;
    const matchStatus = statusFilter === "Tutti" || l.status === statusFilter.toLowerCase();
    return inRange && matchSource && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {rangeOptions.map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? "bg-[#2D6A4F] text-white" : "bg-white border border-gray-100 text-gray-500"}`}>
            {r}
          </button>
        ))}
        <div className="w-full h-0" />
        {["Tutti", "success", "error"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-[#2D6A4F] text-white" : "bg-white border border-gray-100 text-gray-500"}`}>
            {s}
          </button>
        ))}
        <div className="w-full h-0" />
        {sourceOptions.map((s) => (
          <button key={s} onClick={() => setSource(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${source === s ? "bg-gray-800 text-white" : "bg-white border border-gray-100 text-gray-500"}`}>
            {s}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">{filtered.length} eventi trovati</p>

      {/* Logs */}
      <div className="space-y-2">
        {filtered.map((log) => {
          const isOpen = expanded === log.id;
          return (
            <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
              <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(isOpen ? null : log.id)}>
                {log.status === "success"
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800">{log.event_type}</p>
                  <p className="text-[10px] text-gray-400">{log.source} · {new Date(log.timestamp || log.created_date).toLocaleString("it-IT")}</p>
                  {log.user_email && <p className="text-[10px] text-gray-400 truncate">{log.user_email}</p>}
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-2">
                  {log.error_message && (
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-600 mb-1">Errore</p>
                      <p className="text-xs text-red-500">{log.error_message}</p>
                    </div>
                  )}
                  {log.payload && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Payload</p>
                      <pre className="text-[10px] text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                        {(() => { try { return JSON.stringify(JSON.parse(log.payload), null, 2); } catch { return log.payload; } })()}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Nessun evento trovato</p>}
      </div>
    </div>
  );
}