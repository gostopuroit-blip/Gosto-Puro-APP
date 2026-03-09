import { useState } from "react";
import { Copy, Check } from "lucide-react";

const BASE_URL = "https://gostopuro.it";

const SOURCES = [
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "facebook", label: "Facebook", emoji: "👥" },
  { id: "youtube", label: "YouTube", emoji: "▶️" },
  { id: "whatsapp", label: "WhatsApp", emoji: "💬" },
  { id: "pinterest", label: "Pinterest", emoji: "📌" },
  { id: "email", label: "Email", emoji: "📧" },
  { id: "google", label: "Google", emoji: "🔍" },
];

export default function AdminUTMGenerator() {
  const [copied, setCopied] = useState(null);

  const getLink = (source) => `${BASE_URL}?utm_source=${source}`;

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
          O clique é contado <strong>na hora</strong>, mesmo sem login. Se o usuário já estiver logado, o email é associado automaticamente. Se não estiver, aparece só como "visita".
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