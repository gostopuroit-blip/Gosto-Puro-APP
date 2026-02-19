import { useState } from "react";
import { Settings, Crown, Lock, Zap } from "lucide-react";

const premiumFeatures = [
  { key: "planner", label: "Planner 1-click", icon: "📅" },
  { key: "occasioni_speciali", label: "Occasioni Speciali", icon: "🎉" },
  { key: "shopping_list", label: "Lista della spesa completa", icon: "🛒" },
  { key: "cartelle_illimitate", label: "Cartelle illimitate", icon: "📁" },
  { key: "ricette_premium", label: "Ricette Premium", icon: "⭐" },
];

const freeFeatures = [
  { key: "salvataggio_base", label: "Salvataggio ricette", icon: "❤️" },
  { key: "cartella_per_fare", label: "1 cartella (Per fare)", icon: "📋" },
  { key: "ricette_base", label: "Ricette base", icon: "🍽️" },
  { key: "cerca_filtra", label: "Cerca e filtra ricette", icon: "🔍" },
];

export default function AdminSettings() {
  const [maintenance, setMaintenance] = useState(false);

  return (
    <div className="space-y-6">
      {/* Plan rules */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">✨ Funzionalità Premium</p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {premiumFeatures.map((f, i) => (
            <div key={f.key} className={`flex items-center gap-3 px-4 py-3 ${i < premiumFeatures.length - 1 ? "border-b border-gray-50" : ""}`}>
              <span className="text-base">{f.icon}</span>
              <span className="flex-1 text-sm text-gray-700">{f.label}</span>
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">👤 Funzionalità Free</p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {freeFeatures.map((f, i) => (
            <div key={f.key} className={`flex items-center gap-3 px-4 py-3 ${i < freeFeatures.length - 1 ? "border-b border-gray-50" : ""}`}>
              <span className="text-base">{f.icon}</span>
              <span className="flex-1 text-sm text-gray-700">{f.label}</span>
              <Zap className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance mode */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
              <Settings className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Modalità Manutenzione</p>
              <p className="text-xs text-gray-400">Blocca accesso agli utenti</p>
            </div>
          </div>
          <button
            onClick={() => setMaintenance(!maintenance)}
            className={`w-12 h-6 rounded-full transition-colors relative ${maintenance ? "bg-orange-500" : "bg-gray-200"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${maintenance ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
        {maintenance && (
          <div className="mt-3 bg-orange-50 rounded-xl p-3">
            <p className="text-xs text-orange-700 font-semibold">⚠️ Modalità manutenzione attiva — gli utenti vedranno un messaggio di manutenzione</p>
          </div>
        )}
      </div>

      {/* Integrations keys info */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">🔐 Chiavi di Integrazione</p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {["Hotmart", "Brevo", "Stripe"].map((k, i, arr) => (
            <div key={k} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
              <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700">{k}</span>
              <span className="text-xs text-gray-300 font-mono">••••••••••••</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 px-1">Gestisci le chiavi API nelle variabili d'ambiente del progetto</p>
      </div>
    </div>
  );
}