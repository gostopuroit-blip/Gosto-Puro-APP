import { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import { pushSupport, enablePush } from "@/lib/push";
import { trackEvent } from "@/components/useAnalytics";

// Convite GLOBAL e insistente a ativar as notificações push.
// Aparece em qualquer página (não só na Home), depois de alguns segundos,
// 1x por sessão. No "Più tardi" tira uma soneca (reaparece na próxima sessão),
// então continua reofertando até o usuário ativar. Funciona em desktop, Android
// e PWA; no iPhone (que só recebe push com o app instalado) mostra como instalar.

// v2: bump nas chaves reabre o convite pra todos que ainda não ativaram
// (as sonecas antigas viram inválidas). Quem já ativou continua fora.
const SNOOZE_KEY = "gp_notif_snooze_until_v2";
const SESSION_KEY = "gp_notif_seen_session_v2";
const SNOOZE_LATER = 2 * 24 * 60 * 60 * 1000; // 2 dias
const SNOOZE_DENIED = 7 * 24 * 60 * 60 * 1000; // 7 dias (bloqueado → só ajuda)
const DELAY = 4500; // aparece depois de ~4,5s na tela

export default function NotificationNudge({ user }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("ask"); // ask | install | denied | success
  const [contextual, setContextual] = useState(false);
  const [busy, setBusy] = useState(false);

  // Abre o convite se elegível: com suporte, permissão "default", não mostrado nesta
  // sessão e fora da soneca. `isContextual` = veio de uma ação de alto interesse
  // (curtir/salvar) em vez do timer — momento em que a pessoa converte muito mais.
  const openIfEligible = (isContextual) => {
    if (!user) return; // precisa estar logado p/ salvar a inscrição no servidor
    const sup = pushSupport();
    if (!sup.api || sup.permission === "granted") return;
    if (sessionStorage.getItem(SESSION_KEY)) return; // já mostrado nesta sessão
    if (sessionStorage.getItem("gp_nudge_seen_session")) return; // instalar já apareceu nesta sessão
    if (Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0)) return; // em soneca

    let m = "ask";
    if (sup.permission === "denied") m = "denied";
    else if (sup.needsInstallFirst) m = "install";
    setMode(m);
    setContextual(!!isContextual);
    setOpen(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    sessionStorage.setItem("gp_nudge_seen_session", "1"); // bloqueia o de instalar nesta sessão
    trackEvent("notif_nudge_shown", { occasion_label: m, source: isContextual ? "context" : "timer" });
  };

  // Timer: fallback após ~4,5s se a pessoa não interagir antes.
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => openIfEligible(false), DELAY);
    return () => clearTimeout(t);
  }, [user]);

  // Momento de alto interesse: curtir/salvar um post dispara o convite mais cedo.
  useEffect(() => {
    const h = () => openIfEligible(true);
    window.addEventListener("gp:ask-notif", h);
    return () => window.removeEventListener("gp:ask-notif", h);
  }, [user]);

  const later = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_LATER));
    trackEvent("notif_nudge_later", { occasion_label: mode });
    setOpen(false);
  };

  const activate = async () => {
    setBusy(true);
    trackEvent("notif_nudge_click");
    const res = await enablePush();
    setBusy(false);
    if (res === "granted") {
      trackEvent("notif_enabled", { source: "nudge" });
      setMode("success");
      setTimeout(() => setOpen(false), 2200);
    } else if (res === "denied") {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DENIED));
      setMode("denied");
    } else {
      // erro de rede/servidor → tenta de novo mais tarde
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_LATER));
      setOpen(false);
    }
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
          {mode === "success" ? <Check className="w-8 h-8 text-white" /> : <Bell className="w-8 h-8 text-white" />}
        </div>

        {mode === "ask" && (
          <>
            <h2 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mt-4 leading-tight">
              {contextual ? "Ti piace questo? 😍" : "Non perderti la ricetta del giorno 🍝"}
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              {contextual
                ? "Attiva le notifiche e ti avvisiamo quando pubblichiamo ricette e contenuti come questo. 💚"
                : "Attiva le notifiche e ogni giorno ricevi idee per colazione, pranzo e cena — più i nuovi post e le novità. 💚"}
            </p>
            <ul className="mt-4 space-y-2">
              {[
                ["🍳", "La ricetta giusta al momento giusto"],
                ["✨", "Nuovi post e collezioni in anteprima"],
                ["🔕", "Zero spam — la disattivi quando vuoi"],
              ].map(([e, t]) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                  <span className="text-base">{e}</span> {t}
                </li>
              ))}
            </ul>
            <button
              onClick={activate}
              disabled={busy}
              className="mt-5 w-full bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-60"
            >
              {busy ? "Attivazione…" : "Attiva le notifiche"}
            </button>
            <button onClick={later} className="mt-2 w-full text-sm text-gray-400 font-medium py-1.5">
              Più tardi
            </button>
          </>
        )}

        {mode === "install" && (
          <>
            <h2 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mt-4 leading-tight">
              Installa Gosto Puro sull'iPhone 📲
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Aggiungila alla schermata Home per ricevere le notifiche e aprirla come una vera app. Bastano 10 secondi:
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

        {mode === "denied" && (
          <>
            <h2 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mt-4 leading-tight">
              Le notifiche sono bloccate 🔕
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Per riattivarle: tocca il <b>lucchetto 🔒</b> accanto all'indirizzo del sito → <b>Notifiche</b> → <b>Consenti</b>. Poi torna qui. Sull'app installata trovi tutto in <b>Impostazioni → Notifiche</b>.
            </p>
            <button onClick={() => setOpen(false)} className="mt-5 w-full bg-[#2D6A4F] text-white font-bold py-3.5 rounded-2xl">
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
              Da ora ricevi le migliori ricette e le novità. A prestissimo! 💚
            </p>
          </>
        )}
      </div>
    </div>
  );
}
