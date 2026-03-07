import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Título e mensagem são obrigatórios");
      return;
    }
    setSending(true);
    setResult(null);
    const res = await base44.functions.invoke("sendCustomNotification", { title, body, url });
    setSending(false);
    if (res.data?.success) {
      setResult(res.data);
      toast.success(`Notificação enviada para ${res.data.sent} usuários!`);
      setTitle("");
      setBody("");
      setUrl("");
    } else {
      toast.error("Erro ao enviar a notificação");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-[#2D6A4F]" />
          <p className="font-bold text-gray-800">Invia Notifica Push</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Titolo *</label>
          <input
            type="text"
            placeholder="es. 🍽️ Nuove ricette oggi!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Messaggio *</label>
          <textarea
            placeholder="es. Scopri le 3 ricette del giorno..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Link (opzionale)</label>
          <input
            type="text"
            placeholder="es. /ricette"
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
          {sending ? "Invio in corso..." : "Invia a tutti gli utenti"}
        </Button>
      </div>

      {result && (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-sm font-bold text-green-700 mb-1">✓ Notifica inviata</p>
          <p className="text-xs text-green-600">Consegnata: {result.sent} • Fallita: {result.failed} • Rimosse: {result.removed}</p>
        </div>
      )}
    </div>
  );
}