import { useState } from "react";
import { Copy, Check, BookOpen } from "lucide-react";

const BASE_URL = "https://gostopuro.it";

const EBOOKS = [
  {
    id: "ebook_90_ricette_veloci",
    emoji: "⚡",
    it: "90 Ricette Veloci – Pronte in massimo 20 minuti",
    pt: "90 Receitas Rápidas – Prontas em no máximo 20 minutos",
    utm_source: "ebook_90_ricette_veloci",
    utm_medium: "ebook",
    utm_campaign: "90_ricette_veloci",
  },
  {
    id: "ebook_40_cene_sane",
    emoji: "🌙",
    it: "40 Ricette di cene sane e leggere già pronte per la tua settimana",
    pt: "40 Receitas de jantares saudáveis e leves já prontas para a sua semana",
    utm_source: "ebook_40_cene_sane",
    utm_medium: "ebook",
    utm_campaign: "40_cene_sane",
  },
  {
    id: "ebook_99_ricette_sane",
    emoji: "🥗",
    it: "99 Ricette Sane e Leggere – Ricette Salutari e Gustose",
    pt: "99 Receitas Saudáveis e Leves – Receitas Saudáveis e Saborosas",
    utm_source: "ebook_99_ricette_sane",
    utm_medium: "ebook",
    utm_campaign: "99_ricette_sane",
  },
  {
    id: "ebook_99_instagram",
    emoji: "📸",
    it: "99 Ricette di Instagram – Collezione Gosto Puro",
    pt: "99 Receitas do Instagram – Coleção Gosto Puro",
    utm_source: "ebook_99_instagram",
    utm_medium: "ebook",
    utm_campaign: "99_ricette_instagram",
  },
];

function buildUrl(ebook) {
  return `${BASE_URL}?utm_source=${ebook.utm_source}&utm_medium=${ebook.utm_medium}&utm_campaign=${ebook.utm_campaign}`;
}

export default function AdminEbookUTMs() {
  const [copied, setCopied] = useState(null);
  const [lang, setLang] = useState("both"); // "it" | "pt" | "both"

  const handleCopy = (id) => {
    const ebook = EBOOKS.find((e) => e.id === id);
    if (!ebook) return;
    navigator.clipboard.writeText(buildUrl(ebook));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> UTMs para E-books
        </p>
        <p className="text-[11px] text-amber-600 leading-relaxed">
          Cada link direciona para o app com a UTM do e-book correspondente. O sistema rastreia automaticamente a origem quando o usuário acessa.
        </p>
      </div>

      {/* Language toggle */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: "both", label: "🌍 Ambos" },
          { key: "it", label: "🇮🇹 Italiano" },
          { key: "pt", label: "🇧🇷 Português" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setLang(opt.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              lang === opt.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {EBOOKS.map((ebook) => {
          const isCopied = copied === ebook.id;
          const url = buildUrl(ebook);
          return (
            <div key={ebook.id} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-xl mt-0.5">{ebook.emoji}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    {(lang === "it" || lang === "both") && (
                      <p className="text-xs font-bold text-gray-800 leading-snug">
                        🇮🇹 {ebook.it}
                      </p>
                    )}
                    {(lang === "pt" || lang === "both") && (
                      <p className="text-xs font-semibold text-gray-600 leading-snug">
                        🇧🇷 {ebook.pt}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(ebook.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isCopied
                      ? "bg-green-100 text-green-700"
                      : "bg-[#2D6A4F] text-white active:scale-95"
                  }`}
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {isCopied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-400 font-mono break-all leading-relaxed">{url}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}