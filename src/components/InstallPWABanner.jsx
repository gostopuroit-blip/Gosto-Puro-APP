import { useState, useEffect } from "react";
import { X, Download, Bell } from "lucide-react";
import { trackEvent } from "@/components/useAnalytics";

export default function InstallPWABanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Show only once per session
    const shownThisSession = sessionStorage.getItem("pwa_banner_shown");
    if (shownThisSession) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    setShow(true);
    sessionStorage.setItem("pwa_banner_shown", "1");

    if (!ios) {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pwa_banner_dismissed", Date.now().toString());
    setShow(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShow(false);
      setDeferredPrompt(null);
    }
  };

  if (!show) return null;

  if (isIOS) {
    return (
      <div className="mx-5 mb-4 bg-gradient-to-br from-[#2D6A4F] to-[#40916C] rounded-2xl p-4 shadow-lg text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📲</span>
            <p className="text-sm font-bold">Installa l'app sul telefono</p>
          </div>
          <button onClick={handleDismiss} className="text-white/60 p-1 -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-white/80 mb-3 leading-relaxed">
          Aggiungi Gosto Puro alla schermata Home per accedere rapidamente e ricevere le ricette del giorno.
        </p>
        <div className="bg-white/15 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
            <p className="text-xs text-white/90">Tocca <span className="font-bold">⬆️ Condividi</span> nella barra del Safari</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
            <p className="text-xs text-white/90">Scorri e tocca <span className="font-bold">"Aggiungi alla schermata Home"</span></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
            <p className="text-xs text-white/90">Tocca <span className="font-bold">"Aggiungi"</span> in alto a destra ✅</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-4 bg-white border border-[#2D6A4F]/20 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#2D6A4F]/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-[#2D6A4F]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Ricevi le ricette del giorno</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Installa l'app sul telefono per ricevere una notifica ogni mattina con le ricette del giorno.
          </p>
          <button
            onClick={handleInstall}
            className="mt-2.5 flex items-center gap-1.5 bg-[#2D6A4F] text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
          >
            <Download className="w-3.5 h-3.5" />
            Installa l'app
          </button>
        </div>
        <button onClick={handleDismiss} className="text-gray-400 p-1 -mt-1 -mr-1 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}