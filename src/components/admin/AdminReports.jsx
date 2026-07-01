import { useState, useEffect } from "react";
import { Loader2, Flag, Trash2, Check, RefreshCw } from "lucide-react";
import { fetchReports, dismissReport, resolveByDeleting } from "@/api/moderation";
import { toast } from "sonner";

const TYPE_LABEL = { post: "Post", comment: "Commento", story: "Storia" };

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ora";
  if (s < 3600) return `${Math.floor(s / 60)}m fa`;
  if (s < 86400) return `${Math.floor(s / 3600)}h fa`;
  return `${Math.floor(s / 86400)}g fa`;
}

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    fetchReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (r) => {
    if (!window.confirm(`Eliminare definitivamente questo ${TYPE_LABEL[r.target_type] || "conteúdo"}?`)) return;
    setBusy(r.id);
    try {
      await resolveByDeleting(r);
      toast.success("Conteúdo eliminado");
      setReports((prev) => prev.filter((x) => !(x.target_type === r.target_type && x.target_id === r.target_id)));
    } catch {
      toast.error("Erro ao eliminar");
    } finally {
      setBusy(null);
    }
  };

  const ignore = async (r) => {
    setBusy(r.id);
    try {
      await dismissReport(r.id);
      setReports((prev) => prev.filter((x) => x.id !== r.id));
    } catch {
      toast.error("Erro");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Flag className="w-5 h-5 text-[#C0563B]" /> Segnalazioni</h2>
          <p className="text-xs text-gray-500">{reports.length} pendenti — conteúdo denunciado pelos usuários</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><RefreshCw className="w-5 h-5" /></button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
          <Check className="w-8 h-8 text-[#2D6A4F] mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhuma denúncia pendente. Tudo limpo!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
              {r.media_url && (
                <img src={r.media_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase bg-[#C0563B]/10 text-[#C0563B] px-2 py-0.5 rounded-full">
                    {TYPE_LABEL[r.target_type] || r.target_type}
                  </span>
                  <span className="text-[11px] text-gray-400">{timeAgo(r.created_at)}</span>
                </div>
                {r.snapshot && <p className="text-sm text-gray-700 line-clamp-2">"{r.snapshot}"</p>}
                {r.reason && <p className="text-xs text-gray-500 mt-1">Motivo: {r.reason}</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => remove(r)}
                    disabled={busy === r.id}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg"
                  >
                    {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Eliminar conteúdo
                  </button>
                  <button
                    onClick={() => ignore(r)}
                    disabled={busy === r.id}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                  >
                    <Check className="w-3.5 h-3.5" /> Ignorar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
