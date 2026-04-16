import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Clock, Minus, Plus, X } from "lucide-react";

const dayOptions = [
  { value: 7, label: "7 giorni" },
  { value: 15, label: "15 giorni" },
  { value: 30, label: "30 giorni" },
];

const focusOptions = [
  { value: "pratico", label: "Pratico", icon: "⚡", desc: "Ricette veloci e semplici" },
  { value: "leggero", label: "Leggero", icon: "🥗", desc: "Piatti freschi e light" },
];

const timeOptions = [
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

export default function PlannerModal({ onCreate, onClose, isLoading }) {
  const [days, setDays] = useState(7);
  const [focus, setFocus] = useState("pratico");
  const [maxTime, setMaxTime] = useState(20);
  const [maxTimeInput, setMaxTimeInput] = useState("20");
  const [servings, setServings] = useState(2);
  const [dietaryTags, setDietaryTags] = useState([]);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.dietary_tags_profile?.length > 0) {
        setDietaryTags(u.dietary_tags_profile);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" style={{ paddingBottom: "72px" }} onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-[#2D3F35] rounded-t-3xl p-6 overflow-y-auto pb-24" style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2D6A4F] rounded-xl flex items-center justify-center">
              <span className="text-lg">📅</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Configura il tuo Piano</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Personalizza il piano settimanale</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1A2B20]">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Dietary restrictions banner */}
        {dietaryTags.length > 0 && (
          <div className="mb-5 bg-[#F0F7F4] dark:bg-[#1A2B20] border border-[#2D6A4F]/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-base flex-shrink-0">🎯</span>
            <p className="text-xs text-[#2D6A4F] dark:text-[#40916C] font-medium leading-relaxed">
              <span className="font-bold">Abbiamo rilevato le tue restrizioni:</span>{" "}
              {dietaryTags.join(", ")}. Il piano verrà personalizzato per te 🎯
            </p>
          </div>
        )}

        {/* Days */}
        <div className="mb-5">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 block">
            Quanti giorni?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {dayOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                  days === opt.value
                    ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                    : "bg-white dark:bg-[#1A2B20] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-[#3D5246]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>


        {/* Max Time */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 block">
            Tempo massimo per ricetta
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setMaxTime(opt.value); setMaxTimeInput(String(opt.value)); }}
                className={`py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  maxTime === opt.value
                    ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                    : "bg-white dark:bg-[#1A2B20] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-[#3D5246]"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
          {/* Custom time input */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#1A2B20] border border-gray-100 dark:border-[#3D5246] rounded-xl px-4 py-2.5">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Personalizzato:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={maxTimeInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setMaxTimeInput(raw);
                const v = parseInt(raw);
                if (!isNaN(v) && v >= 1) setMaxTime(v);
              }}
              onBlur={() => {
                const v = parseInt(maxTimeInput);
                const clamped = isNaN(v) || v < 5 ? 5 : v > 180 ? 180 : v;
                setMaxTime(clamped);
                setMaxTimeInput(String(clamped));
              }}
              className="w-16 text-center font-bold text-gray-900 dark:text-white bg-transparent outline-none text-sm"
            />
            <span className="text-sm text-gray-400">min</span>
          </div>
        </div>

        {/* Servings */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 block">
            Per quante persone?
          </label>
          <div className="flex items-center gap-4 justify-center bg-white dark:bg-[#1A2B20] border border-gray-100 dark:border-[#3D5246] rounded-xl py-3">
            <button
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-[#3D5246] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2D3F35]"
            >
              <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="text-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{servings}</span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{servings === 1 ? "persona" : "persone"}</p>
            </div>
            <button
              onClick={() => setServings((s) => Math.min(12, s + 1))}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-[#3D5246] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2D3F35]"
            >
              <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5">Le quantità di ingredienti si adatteranno automaticamente</p>
        </div>

        <Button
          onClick={() => onCreate({ days, focus, maxTime, servings, dietaryTags })}
          disabled={isLoading}
          className="w-full py-6 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold text-sm shadow-lg shadow-[#2D6A4F]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Criando..." : "✨ Crea il mio piano"}
        </Button>
      </div>
    </div>
  );
}