import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/components/useAnalytics";
import { MessageSquareHeart, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

// ⚠️ INATIVO: o card não aparece para os usuários enquanto for false.
// Para visualizar mesmo inativo, abra a Home com ?survey=preview na URL.
// Vire true quando a enquete estiver pronta para lançar.
const SURVEY_ACTIVE = false;

// Apenas coleções que NÃO existem no app — o objetivo é descobrir demanda nova.
const OCCASION_OPTIONS = [
  "Ricette per bambini",
  "Aperitivo & finger food",
  "Ricette delle feste (Natale, Pasqua…)",
  "Pane, pizza & lievitati fatti in casa",
  "Svuotafrigo (anti-spreco)",
  "Ricette con 5 ingredienti",
  "Bowl & piatti unici",
  "Zuppe & vellutate",
  "Ricette senza glutine",
  "Smoothie & bevande sane",
  "Slow cooker / pentola a pressione",
];

const IMPROVEMENT_OPTIONS = [
  "Più ricette",
  "Ricerca migliore",
  "App più veloce",
  "Più foto e video",
  "Lista della spesa",
  "Planner dei pasti",
  "Notifiche utili",
  "Modalità offline",
];

const COOKS_FOR_OPTIONS = [
  "Solo per me",
  "In coppia",
  "Famiglia con bambini",
  "Famiglia senza bambini",
  "Amici / ospiti",
];

const FACES = [
  { v: 1, e: "😞", l: "Per niente" },
  { v: 2, e: "😕", l: "Poco" },
  { v: 3, e: "😐", l: "Così così" },
  { v: 4, e: "😊", l: "Mi piace" },
  { v: 5, e: "😍", l: "La adoro" },
];

export default function Survey({ user: userProp }) {
  const [user, setUser] = useState(userProp || null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(() => localStorage.getItem("gp_survey_done") === "1");
  const [satisfaction, setSatisfaction] = useState(0);
  const [cooksFor, setCooksFor] = useState("");
  const [occasions, setOccasions] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (userProp) { setUser(userProp); return; }
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null)).catch(() => {});
  }, [userProp]);

  const preview = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("survey") === "preview";

  if (!user) return null;
  if (!SURVEY_ACTIVE && !preview) return null; // inativo: escondido dos usuários
  if (done && !preview) return null;

  const toggle = (arr, setArr, v) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const submit = async () => {
    if (!satisfaction) {
      toast.error("Dicci prima quanto ti piace l'app 🙂");
      return;
    }
    // Modo preview: não grava nada, só mostra como fica.
    if (preview) {
      setThanks(true);
      setTimeout(() => setOpen(false), 1900);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("survey_responses").insert({
      user_id: user.id,
      user_email: user.email,
      satisfaction,
      cooks_for: cooksFor || null,
      occasions_wanted: occasions,
      improvements,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        // 1 resposta por usuário — já respondeu
        localStorage.setItem("gp_survey_done", "1");
        toast.success("Hai già risposto, grazie! 🙏");
        setOpen(false);
        setDone(true);
        return;
      }
      toast.error("Ops, qualcosa è andato storto. Riprova.");
      return;
    }
    try { trackEvent("survey_submitted", { occasion_label: `sat_${satisfaction}` }); } catch (_) {}
    localStorage.setItem("gp_survey_done", "1");
    setThanks(true);
    setTimeout(() => { setOpen(false); setDone(true); }, 1900);
  };

  const Chip = ({ label, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
        active
          ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
          : "bg-white dark:bg-[#2D3F35] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#3D5246]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Card trigger */}
      <div className="px-5 mt-4">
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left rounded-3xl p-4 bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-white shadow-lg shadow-[#2D6A4F]/20 flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Aiutaci a migliorare 💬</p>
            <p className="text-xs text-white/80">5 domande veloci · meno di 1 minuto</p>
          </div>
          <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl">Inizia</span>
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#1F2D24] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {thanks ? (
              <div className="p-10 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-[#2D6A4F]" />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Grazie di cuore! 🙏</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Il tuo parere ci aiuta a far crescere Gosto Puro.</p>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">La tua opinione conta</p>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Solo 5 domande veloci. Grazie per il tuo tempo! ✨</p>

                {/* Q1 satisfaction */}
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">1. Quanto ti piace Gosto Puro?</p>
                  <div className="flex justify-between gap-1">
                    {FACES.map((f) => (
                      <button
                        key={f.v}
                        onClick={() => setSatisfaction(f.v)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl border transition-all ${
                          satisfaction === f.v
                            ? "border-[#2D6A4F] bg-[#2D6A4F]/5 scale-105"
                            : "border-transparent opacity-60"
                        }`}
                      >
                        <span className="text-2xl">{f.e}</span>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400">{f.l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2 cooks_for */}
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">2. Per chi cucini di solito?</p>
                  <div className="flex flex-wrap gap-2">
                    {COOKS_FOR_OPTIONS.map((o) => (
                      <Chip key={o} label={o} active={cooksFor === o} onClick={() => setCooksFor(cooksFor === o ? "" : o)} />
                    ))}
                  </div>
                </div>

                {/* Q3 occasions */}
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">3. Quali nuove raccolte vorresti vedere?</p>
                  <p className="text-[11px] text-gray-400 mb-3">Scegli quante vuoi · non vedi la tua? scrivila nel commento 👇</p>
                  <div className="flex flex-wrap gap-2">
                    {OCCASION_OPTIONS.map((o) => (
                      <Chip key={o} label={o} active={occasions.includes(o)} onClick={() => toggle(occasions, setOccasions, o)} />
                    ))}
                  </div>
                </div>

                {/* Q3 improvements */}
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">4. Cosa miglioreresti?</p>
                  <p className="text-[11px] text-gray-400 mb-3">Scegli quante vuoi</p>
                  <div className="flex flex-wrap gap-2">
                    {IMPROVEMENT_OPTIONS.map((o) => (
                      <Chip key={o} label={o} active={improvements.includes(o)} onClick={() => toggle(improvements, setImprovements, o)} />
                    ))}
                  </div>
                </div>

                {/* Q4 comment */}
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">5. Vuoi dirci altro? (facoltativo)</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Idee, prodotti che vorresti, cosa ti manca…"
                    className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-[#3D5246] bg-white dark:bg-[#2D3F35] text-sm dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 resize-none"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-[#2D6A4F] text-white font-bold text-sm shadow-lg shadow-[#2D6A4F]/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? "Invio…" : "Invia"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
