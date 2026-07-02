import { useState } from "react";
import { Copy, Check } from "lucide-react";

const BASE_URL = "https://gostopuro.com";

// Rotas curtas e limpas (sem ?utm feio) → cada uma leva à página /download
// e já registra a origem no painel Admin → "Página /download".
const SOURCES = [
  { id: "tiktok", label: "TikTok", emoji: "🎵", path: "/tt" },
  { id: "instagram", label: "Instagram", emoji: "📸", path: "/ig" },
  { id: "facebook", label: "Facebook", emoji: "👥", path: "/fb" },
  { id: "youtube", label: "YouTube", emoji: "▶️", path: "/yt" },
  { id: "whatsapp", label: "WhatsApp", emoji: "💬", path: "/wa" },
  { id: "pinterest", label: "Pinterest", emoji: "📌", path: "/pin" },
  { id: "email", label: "Email", emoji: "📧", path: "/em" },
  { id: "google", label: "Google", emoji: "🔍", path: "/gg" },
];

export default function AdminUTMGenerator() {
  const [copied, setCopied] = useState(null);

  const getLink = (source) => {
    const s = SOURCES.find((x) => x.id === source);
    return `${BASE_URL}${s?.path || `/download?utm_source=${source}`}`;
  };

  const handleCopy = (source) => {
    navigator.clipboard.writeText(getLink(source));
    setCopied(source);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 rounded-xl p-3">
        <p className="text-xs font-bold text-blue-700 mb-1">Como funciona?</p>
        <p className="text-[11px] text-blue-600 leading-relaxed">
          Cada link é <strong>limpo</strong> (sem <code>?utm</code> feio) e leva à página de <strong>instalação do app</strong> (/download). A origem é registrada automaticamente no painel <strong>Admin → "Página /download" → "De onde vêm as visitas"</strong>. Cole na bio, story ou descrição.
        </p>
      </div>

      <div className="space-y-2">
        {SOURCES.map((s) => {
          const link = getLink(s.id);
          const isCopied = copied === s.id;
          return (
            <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <span className="text-xl w-8 text-center">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">{s.label}</p>
                <p className="text-[10px] text-gray-400 truncate font-mono">{link}</p>
              </div>
              <button
                onClick={() => handleCopy(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isCopied
                    ? "bg-green-100 text-green-700"
                    : "bg-[#2D6A4F] text-white active:scale-95"
                }`}
              >
                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {isCopied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}