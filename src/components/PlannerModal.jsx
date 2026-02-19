import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Salad, Users, Clock, Minus, Plus } from "lucide-react";

const dayOptions = [
  { value: 3, label: "3 giorni" },
  { value: 5, label: "5 giorni" },
  { value: 7, label: "7 giorni" },
];

const focusOptions = [
  { value: "pratico", label: "Pratico", icon: "⚡", desc: "Ricette veloci e semplici" },
  { value: "leggero", label: "Leggero", icon: "🥗", desc: "Piatti freschi e light" },
  { value: "famiglia", label: "Famiglia", icon: "👨‍👩‍👧", desc: "Per tutta la famiglia" },
];

const timeOptions = [
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
];

export default function PlannerModal({ open, onClose, onCreate }) {
  const [days, setDays] = useState(5);
  const [focus, setFocus] = useState("pratico");
  const [maxTime, setMaxTime] = useState(20);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-[#F0F7F4] to-white p-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#2D6A4F] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Configura il tuo Piano</h2>
            <p className="text-xs text-gray-400 mt-1">Personalizza il piano settimanale</p>
          </div>

          {/* Days */}
          <div className="mb-5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 block">
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
                      : "bg-white text-gray-500 border border-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus */}
          <div className="mb-5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 block">
              Foco
            </label>
            <div className="space-y-2">
              {focusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFocus(opt.value)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
                    focus === opt.value
                      ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                      : "bg-white text-gray-600 border border-gray-100"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className={`text-[11px] ${focus === opt.value ? "text-white/70" : "text-gray-400"}`}>
                      {opt.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Time */}
          <div className="mb-6">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 block">
              Tempo massimo per ricetta
            </label>
            <div className="grid grid-cols-3 gap-2">
              {timeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMaxTime(opt.value)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    maxTime === opt.value
                      ? "bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20"
                      : "bg-white text-gray-500 border border-gray-100"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => onCreate({ days, focus, maxTime })}
            className="w-full py-6 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold text-sm shadow-lg shadow-[#2D6A4F]/20"
          >
            ✨ Crea il mio piano
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}