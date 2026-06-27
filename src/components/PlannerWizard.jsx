import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, ChevronLeft, Check, Sparkles } from "lucide-react";

// Fluxo di creazione del piano — livello "nonna di 80 anni":
// Step 0 = piano in 1 tocco (default già scelti). "Personalizza" apre il guidato.
// Step 1..5 = una domanda per schermata, cartoni grandi, una sola azione.

const FOCUS = [
  { value: "pratico", label: "Pratico", icon: "⚡", desc: "Veloce e semplice" },
  { value: "leggero", label: "Leggero", icon: "🥗", desc: "Fresco e light" },
  { value: "equilibrato", label: "Equilibrato", icon: "⚖️", desc: "Bilanciato" },
  { value: "proteico", label: "Proteico", icon: "💪", desc: "Più proteine" },
  { value: "dimagrante", label: "Dimagrante", icon: "🔥", desc: "Poche calorie" },
  { value: "famiglia", label: "Famiglia", icon: "👨‍👩‍👧", desc: "Per tutta la famiglia" },
];
const DAYS = [
  { value: 7, label: "7 giorni", desc: "Una settimana" },
  { value: 15, label: "15 giorni", desc: "Due settimane" },
  { value: 30, label: "30 giorni", desc: "Un mese intero" },
];
const TIMES = [
  { value: 15, label: "15 minuti", desc: "Super veloce" },
  { value: 20, label: "20 minuti", desc: "Veloce" },
  { value: 30, label: "30 minuti", desc: "Con un po' di tempo" },
  { value: 45, label: "45 minuti", desc: "Con calma" },
];

const TOTAL_STEPS = 5;

export default function PlannerWizard({ onCreate, onClose, isLoading }) {
  const [step, setStep] = useState(0); // 0 = hub "1 tocco"
  const [days, setDays] = useState(7);
  const [focus, setFocus] = useState("pratico");
  const [maxTime, setMaxTime] = useState(20);
  const [servings, setServings] = useState(2);
  const [dietaryTags, setDietaryTags] = useState([]);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (u?.dietary_tags_profile?.length > 0) setDietaryTags(u.dietary_tags_profile);
    }).catch(() => {});
  }, []);

  const create = () => onCreate({ days, focus, maxTime, servings, dietaryTags });
  const focusInfo = FOCUS.find((f) => f.value === focus) || FOCUS[0];

  const Sheet = ({ children }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-[72px] sm:items-center sm:p-4 sm:pb-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-[#2D3F35] rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  // Cartão grande de opção (alvo fácil de tocar)
  const Card = ({ icon, label, desc, selected, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border-2 ${
        selected
          ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/25"
          : "bg-white dark:bg-[#1A2B20] border-gray-100 dark:border-[#3D5246] text-gray-800 dark:text-gray-200"
      }`}
    >
      <span className="text-3xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold leading-tight">{label}</p>
        {desc && <p className={`text-xs leading-tight mt-0.5 ${selected ? "text-white/75" : "text-gray-400 dark:text-gray-500"}`}>{desc}</p>}
      </div>
      {selected && <Check className="w-6 h-6 flex-shrink-0" />}
    </button>
  );

  const BigButton = ({ children, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-5 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold text-lg shadow-lg shadow-[#2D6A4F]/25 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );

  // Cabeçalho dos passos guiados: voltar + progresso
  const StepHeader = ({ n }) => (
    <div className="px-5 pt-5">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setStep(n - 1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1A2B20]">
          <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Passo {n} di {TOTAL_STEPS}</span>
        <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1A2B20]">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-[#1A2B20] rounded-full overflow-hidden mb-5">
        <div className="h-full bg-[#2D6A4F] rounded-full transition-all duration-300" style={{ width: `${(n / TOTAL_STEPS) * 100}%` }} />
      </div>
    </div>
  );

  // ---- STEP 0: piano in 1 tocco ----
  if (step === 0) {
    return (
      <Sheet>
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-end -mt-1 -mr-1">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1A2B20]">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#2D6A4F] rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Il tuo piano della settimana</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Già pronto. Tocca e parti. 👇</p>
          </div>

          <div className="bg-[#F0F7F4] dark:bg-[#1A2B20] border border-[#2D6A4F]/20 rounded-2xl p-4 mb-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { ic: "📅", t: `${days} giorni` },
                { ic: focusInfo.icon, t: focusInfo.label },
                { ic: "⏱", t: `${maxTime} min` },
                { ic: "👥", t: `${servings} ${servings === 1 ? "persona" : "persone"}` },
              ].map((x, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xl">{x.ic}</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{x.t}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#2D6A4F] dark:text-[#40916C] font-semibold text-center mt-3">✓ già scelto per te</p>
          </div>

          <BigButton onClick={create} disabled={isLoading}>
            {isLoading ? "Sto creando…" : "✨ Crea il mio piano adesso"}
          </BigButton>

          <button
            onClick={() => setStep(1)}
            className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#2D6A4F] dark:hover:text-[#40916C] flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="text-base">⚙️</span> Personalizza
          </button>
        </div>
      </Sheet>
    );
  }

  // ---- STEP 1: Tipo ----
  if (step === 1) {
    return (
      <Sheet>
        <StepHeader n={1} />
        <div className="px-5 flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Che tipo di menu?</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Scegli lo stile dei piatti</p>
          <div className="space-y-2.5">
            {FOCUS.map((o) => (
              <Card key={o.value} icon={o.icon} label={o.label} desc={o.desc} selected={focus === o.value} onClick={() => setFocus(o.value)} />
            ))}
          </div>
        </div>
        <div className="p-5"><BigButton onClick={() => setStep(2)}>Avanti →</BigButton></div>
      </Sheet>
    );
  }

  // ---- STEP 2: Giorni ----
  if (step === 2) {
    return (
      <Sheet>
        <StepHeader n={2} />
        <div className="px-5 flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Per quanti giorni?</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Quanto deve durare il piano</p>
          <div className="space-y-2.5">
            {DAYS.map((o) => (
              <Card key={o.value} icon="📅" label={o.label} desc={o.desc} selected={days === o.value} onClick={() => setDays(o.value)} />
            ))}
          </div>
        </div>
        <div className="p-5"><BigButton onClick={() => setStep(3)}>Avanti →</BigButton></div>
      </Sheet>
    );
  }

  // ---- STEP 3: Tempo ----
  if (step === 3) {
    return (
      <Sheet>
        <StepHeader n={3} />
        <div className="px-5 flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Quanto tempo per cucinare?</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Il massimo per ogni ricetta</p>
          <div className="space-y-2.5">
            {TIMES.map((o) => (
              <Card key={o.value} icon="⏱" label={o.label} desc={o.desc} selected={maxTime === o.value} onClick={() => setMaxTime(o.value)} />
            ))}
          </div>
        </div>
        <div className="p-5"><BigButton onClick={() => setStep(4)}>Avanti →</BigButton></div>
      </Sheet>
    );
  }

  // ---- STEP 4: Persone ----
  if (step === 4) {
    return (
      <Sheet>
        <StepHeader n={4} />
        <div className="px-5 flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Per quante persone?</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Le quantità si adattano da sole</p>
          <div className="flex items-center justify-center gap-6 py-6">
            <button onClick={() => setServings((s) => Math.max(1, s - 1))} className="w-16 h-16 rounded-2xl border-2 border-gray-200 dark:border-[#3D5246] flex items-center justify-center text-3xl font-bold text-gray-600 dark:text-gray-300 active:scale-95">−</button>
            <div className="text-center w-24">
              <div className="text-6xl font-bold text-[#2D6A4F] dark:text-[#40916C] leading-none">{servings}</div>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{servings === 1 ? "persona" : "persone"}</p>
            </div>
            <button onClick={() => setServings((s) => Math.min(12, s + 1))} className="w-16 h-16 rounded-2xl border-2 border-gray-200 dark:border-[#3D5246] flex items-center justify-center text-3xl font-bold text-gray-600 dark:text-gray-300 active:scale-95">+</button>
          </div>
        </div>
        <div className="p-5"><BigButton onClick={() => setStep(5)}>Avanti →</BigButton></div>
      </Sheet>
    );
  }

  // ---- STEP 5: Riepilogo ----
  return (
    <Sheet>
      <StepHeader n={5} />
      <div className="px-5 flex-1 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Tutto pronto! 🎉</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Ecco il tuo piano</p>
        <div className="bg-[#F0F7F4] dark:bg-[#1A2B20] border border-[#2D6A4F]/20 rounded-2xl divide-y divide-[#2D6A4F]/10">
          {[
            { ic: focusInfo.icon, k: "Tipo di menu", v: focusInfo.label, go: 1 },
            { ic: "📅", k: "Giorni", v: `${days} giorni`, go: 2 },
            { ic: "⏱", k: "Tempo per ricetta", v: `${maxTime} minuti`, go: 3 },
            { ic: "👥", k: "Persone", v: `${servings} ${servings === 1 ? "persona" : "persone"}`, go: 4 },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <span className="text-2xl">{r.ic}</span>
              <div className="flex-1">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{r.k}</p>
                <p className="text-base font-bold text-gray-800 dark:text-gray-200">{r.v}</p>
              </div>
              <button onClick={() => setStep(r.go)} className="text-xs font-semibold text-[#2D6A4F] dark:text-[#40916C]">Cambia</button>
            </div>
          ))}
        </div>
        {dietaryTags.length > 0 && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 text-center">🎯 Adattato alle tue preferenze: {dietaryTags.join(", ")}</p>
        )}
      </div>
      <div className="p-5">
        <BigButton onClick={create} disabled={isLoading}>
          {isLoading ? "Sto creando…" : "✨ Crea il mio piano"}
        </BigButton>
      </div>
    </Sheet>
  );
}
