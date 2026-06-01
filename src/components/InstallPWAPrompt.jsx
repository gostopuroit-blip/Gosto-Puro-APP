import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Banner discreto que aparece quando o navegador detecta que o PWA é instalável.
 * Capta o evento beforeinstallprompt e oferece um CTA. Dispensável com X (memorizado).
 */
export default function InstallPWAPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("pwa_install_dismissed") === "1") return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Detecta se já está instalado (modo standalone)
    if (window.matchMedia?.("(display-mode: standalone)").matches) {
      setShow(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!show || !deferred) return null;

  const handleInstall = async () => {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa_install_dismissed", "1");
    setShow(false);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto bg-white dark:bg-[#2D3F35] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#3D5246] p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <div className="w-10 h-10 bg-[#2D6A4F]/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <Download className="w-5 h-5 text-[#2D6A4F]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Installa Gosto Puro</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Accedi rapidamente dalla tua schermata home</p>
      </div>
      <button
        onClick={handleInstall}
        className="bg-[#2D6A4F] text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
      >
        Installa
      </button>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600" aria-label="Chiudi">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
