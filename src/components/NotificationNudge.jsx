import { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import { pushSupport, enablePush } from "@/lib/push";
import { trackEvent } from "@/components/useAnalytics";

// Convite GLOBAL e insistente a ativar as notificações push.
// Aparece em qualquer página (não só na Home), depois de alguns segundos,
// 1x por sessão. No "Più tardi" tira uma soneca (reaparece na próxima sessão),
// então continua reofertando até o usuário ativar. Funciona em desktop, Android
// e PWA; no iPhone (que só recebe push com o app instalado) mostra como instalar.

const SNOOZE_KEY = "gp_notif_snooze_until";
const SESSION_KEY = "gp_notif_seen_session";
const SNOOZE_LATER = 2 * 24 * 60 * 60 * 1000; // 2 dias
const SNOOZE_DENIED = 7 * 24 * 60 * 60 * 1000; // 7 dias (bloqueado → só ajuda)
const DELAY = 4500; // aparece depois de ~4,5s na tela

export default function NotificationNudge({ user }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("ask"); // ask | install | denied | success
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return; // precisa estar logado p/ salvar a inscrição no servidor
    const sup = pushSupport();
    if (!sup.api) return; // navegador sem suporte a push
    if (sup.permission === "granted") return; // já ativo
    if (sessionStorage.getItem(SESSION_KEY)) return; // já mostrado nesta sessão
    if (Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0)) return; // em soneca

    let m = "ask";
    if (sup.permission === "denied") m = "denied";
    else if (sup.needsInstallFirst) m = "install";
    setMode(m);

    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
      trackEvent("notif_nudge_shown", { mode: m });
    }, DELAY);
    return () => clearTimeout(t);
  }, [user]);

  const later = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_LATER));
    trackEvent("notif_nudge_later", { mode });
    setOpen(false);
  };

  const activate = async () => {
    setBusy(true);
    trackEvent("notif_nudge_click");
    const res = await enablePush();
    setBusy(false);
    if (res === "granted") {
      trackEvent("notif_enabled", { from: "nudge" });
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
              Non perderti la ricetta del giorno 🍝
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Attiva le notifiche e ogni giorno ricevi idee per colazione, pranzo e cena — più i nuovi post e le novità. 💚
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
              Installa l'app per le notifiche 📲
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Su iPhone le notifiche funzionano solo con l'app sulla schermata Home. Bastano 10 secondi:
            </p>
            <ol className="mt-4 space-y-2.5 text-sm text-gray-700 dark:text-gray-200">
              <li className="flex gap-2"><b>1.</b> Tocca <b>Condividi</b> ⬆️ nella barra di Safari</li>
              <li className="flex gap-2"><b>2.</b> Scegli <b>“Aggiungi a schermata Home”</b></li>
              <li className="flex gap-2"><b>3.</b> Apri Gosto Puro dall'icona e attiva le notifiche</li>
            </ol>
            <button onClick={later} className="mt-5 w-full bg-[#2D6A4F] text-white font-bold py-3.5 rounded-2xl">
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
