import { useState, useEffect, useRef } from "react";
import { Download, X, Check } from "lucide-react";
import { isStandalone, isIOS } from "@/lib/push";
import { trackEvent } from "@/components/useAnalytics";

// Convite GLOBAL a INSTALAR o app (adicionar à tela inicial).
// Aparece pra quem está no navegador (NÃO instalado), depois de alguns segundos,
// 1x por sessão. Vende o porquê: notificações com a nossa marca (não "Chrome"),
// abre como app de verdade e funciona offline. No iPhone mostra o passo-a-passo;
// no Android/desktop usa o prompt nativo (beforeinstallprompt).
//
// Coordena com o NotificationNudge por uma chave de sessão COMPARTILHADA
// (`gp_nudge_seen_session`) → nunca aparecem dois modais na mesma sessão.
// Instalar tem prioridade: resolve a marca da notificação e, no iPhone, é o que
// destrava o push. Depois de instalado, o convite de notificação assume.

const SNOOZE_KEY = "gp_install_snooze_until";
const SHARED_SESSION_KEY = "gp_nudge_seen_session"; // dividido com NotificationNudge
const SNOOZE_LATER = 3 * 24 * 60 * 60 * 1000; // 3 dias
const DELAY = 3500; // aparece um pouco ANTES do de notificação (4,5s), p/ ter prioridade

export default function InstallNudge({ user }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("android"); // android | ios | success
  const [busy, setBusy] = useState(false);
  const deferredRef = useRef(null); // evento beforeinstallprompt guardado

  // Abre o convite se elegível: logado, ainda não instalado, com um caminho real
  // de instalação (prompt nativo capturado OU iPhone), fora da soneca e nenhum
  // outro nudge já mostrado nesta sessão.
  const openIfEligible = () => {
    if (!user) return;
    if (isStandalone()) return; // já instalado → deixa o de notificação agir
    if (sessionStorage.getItem(SHARED_SESSION_KEY)) return; // já teve um nudge nesta sessão
    if (Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0)) return; // em soneca

    let m = null;
    if (deferredRef.current) m = "android"; // Android/desktop Chrome-Edge
    else if (isIOS()) m = "ios"; // iPhone/iPad Safari
    if (!m) return; // sem caminho de instalação aqui (ex.: desktop Firefox) → não insiste

    setMode(m);
    setOpen(true);
    sessionStorage.setItem(SHARED_SESSION_KEY, "1");
    trackEvent("pwa_install_shown", { occasion_label: m });
  };

  // Captura o prompt nativo assim que o navegador o oferece; se já passou o tempo
  // do timer, tenta abrir na hora.
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      deferredRef.current = e;
      openIfEligible();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // Se instalar durante a sessão, fecha e não incomoda mais.
    const onInstalled = () => { setOpen(false); deferredRef.current = null; };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [user]);

  // Timer: fallback após ~3,5s (cobre o iPhone, que não dispara beforeinstallprompt).
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(openIfEligible, DELAY);
    return () => clearTimeout(t);
  }, [user]);

  const later = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_LATER));
    trackEvent("pwa_install_later", { occasion_label: mode });
    setOpen(false);
  };

  const install = async () => {
    trackEvent("pwa_install_click", { occasion_label: "nudge" });
    const dp = deferredRef.current;
    if (!dp) { setOpen(false); return; }
    setBusy(true);
    try {
      dp.prompt();
      const { outcome } = await dp.userChoice;
      if (outcome === "accepted") {
        trackEvent("pwa_install_accepted", { source: "nudge" });
        setMode("success");
        setTimeout(() => setOpen(false), 2400);
      } else {
        // recusou o prompt nativo → soneca e fecha
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_LATER));
        setOpen(false);
      }
    } catch {
      setOpen(false);
    }
    deferredRef.current = null;
    setBusy(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={mode === "success" ? undefined : later}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-[#1A1A1A] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl animate-[nudgeIn_.24s_ease-out]">
        <style>{`@keyframes nudgeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

        {mode !== "success" && (
          <button
            onClick={later}
            aria-label="Chiudi"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-400 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center shadow-lg">
          {mode === "success" ? <Check className="w-8 h-8 text-white" /> : <Download className="w-8 h-8 text-white" />}
        </div>

        {mode === "android" && (
          <>
            <h2 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mt-4 leading-tight">
              Installa Gosto Puro 📲
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Aggiungila alla schermata Home: si apre come una vera app ed è tutto più veloce.
            </p>
            <ul className="mt-4 space-y-2">
              {[
                ["🔔", "Notifiche col nostro nome, non “Chrome”"],
                ["⚡", "Si apre come un'app, senza barra del browser"],
                ["📴", "Funziona anche offline"],
              ].map(([e, t]) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                  <span className="text-base">{e}</span> {t}
                </li>
              ))}
            </ul>
            <button
              onClick={install}
              disabled={busy}
              className="mt-5 w-full bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-60"
            >
              {busy ? "Installazione…" : "Installa ora"}
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">Gratis · niente App Store · 10 secondi</p>
            <button onClick={later} className="mt-1.5 w-full text-sm text-gray-400 font-medium py-1.5">
              Più tardi
            </button>
          </>
        )}

        {mode === "ios" && (
          <>
            <h2 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mt-4 leading-tight">
              Installa Gosto Puro sull'iPhone 📲
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Aggiungila alla schermata Home per aprirla come un'app e ricevere le notifiche. Bastano 10 secondi:
            </p>
            <ol className="mt-4 space-y-3">
              {[
                ["1", <>Tocca <b>Condividi</b> <span aria-hidden>⬆️</span> nella barra di Safari</>],
                ["2", <>Scegli <b>“Aggiungi a schermata Home”</b></>],
                ["3", <>Apri <b>Gosto Puro</b> dall'icona e attiva le notifiche</>],
              ].map(([n, t]) => (
                <li key={n} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2D6A4F] text-white font-bold text-sm flex items-center justify-center">{n}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-200">{t}</span>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-gray-400 text-center mt-3">Gratis · funziona come un'app · niente App Store</p>
            <button onClick={later} className="mt-4 w-full bg-[#2D6A4F] text-white font-bold py-3.5 rounded-2xl">
              Ho capito
            </button>
          </>
        )}

        {mode === "success" && (
          <>
            <h2 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mt-4">
              Fatto! 🎉
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
              Ora trovi Gosto Puro sulla tua schermata Home. A prestissimo! 💚
            </p>
          </>
        )}
      </div>
    </div>
  );
}
