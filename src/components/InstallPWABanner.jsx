import { useState, useEffect } from "react";
import { X, Download, Bell } from "lucide-react";

export default function InstallPWABanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Already installed as PWA
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone) return;

    // Dismissed recently (24h)
    const dismissed = localStorage.getItem("pwa_banner_dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      setShow(true);
    } else {
      // Android/Desktop: listen for beforeinstallprompt
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
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

  return (
    <div className="mx-5 mb-4 bg-white border border-[#2D6A4F]/20 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#2D6A4F]/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-[#2D6A4F]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Ricevi le ricette del giorno</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            {isIOS
              ? 'Aggiungi l\'app alla schermata home: tocca ⬆️ poi "Aggiungi a Home" per ricevere notifiche ogni giorno.'
              : "Installa l'app sul telefono per ricevere una notifica ogni mattina con le ricette del giorno."}
          </p>

          {!isIOS && (
            <button
              onClick={handleInstall}
              className="mt-2.5 flex items-center gap-1.5 bg-[#2D6A4F] text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              <Download className="w-3.5 h-3.5" />
              Installa l'app
            </button>
          )}
        </div>
        <button onClick={handleDismiss} className="text-gray-400 p-1 -mt-1 -mr-1 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}