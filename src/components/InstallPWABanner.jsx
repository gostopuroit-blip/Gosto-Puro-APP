import { useState, useEffect } from "react";
import { X, Download, Bell } from "lucide-react";
import { trackEvent } from "@/components/useAnalytics";

export default function InstallPWABanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Show based on dismissal count: day 1, 3, 7 with longer intervals
    const dismissCount = parseInt(localStorage.getItem("pwa_banner_dismiss_count") || "0");
    const lastShown = parseInt(localStorage.getItem("pwa_banner_last_shown") || "0");
    const now = Date.now();
    
    let shouldShow = false;
    if (dismissCount === 0) {
      shouldShow = true; // Always show first time
    } else if (dismissCount === 1) {
      shouldShow = now - lastShown > 3 * 24 * 60 * 60 * 1000; // 3 days
    } else if (dismissCount === 2) {
      shouldShow = now - lastShown > 7 * 24 * 60 * 60 * 1000; // 7 days
    }
    // After 3+ dismissals, stop showing

    if (!shouldShow) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    setShow(true);
    localStorage.setItem("pwa_banner_last_shown", now.toString());
    trackEvent("pwa_install_click", { occasion_label: "banner_shown" });

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
    const count = parseInt(localStorage.getItem("pwa_banner_dismiss_count") || "0");
    localStorage.setItem("pwa_banner_dismiss_count", (count + 1).toString());
    trackEvent("pwa_install_click", { occasion_label: "banner_dismissed" });
    setShow(false);
  };

  const handleInstall = async () => {
    trackEvent("pwa_install_click", { occasion_label: "banner_clicked" });
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        trackEvent("pwa_install_click", { occasion_label: "banner_installed" });
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!show) return null;

  if (isIOS) {
    return (
      <div className="mx-5 mb-4 bg-gradient-to-br from-[#2D6A4F] via-[#40916C] to-[#2D6A4F] rounded-2xl p-4 shadow-xl text-white border border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce" style={{ animationDelay: "0s" }}>📲</span>
            <div>
              <p className="text-sm font-bold leading-tight">Installa l'app</p>
              <p className="text-[11px] text-white/70">Accesso rapido + notifiche</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-white/60 hover:text-white p-1 -mt-1 -mr-1 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 space-y-2.5">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/30 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</div>
            <p className="text-xs text-white/90 leading-snug">Tocca <span className="font-bold">⬆️ Condividi</span> in basso</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/30 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</div>
            <p className="text-xs text-white/90 leading-snug">Scegli <span className="font-bold">"Aggiungi alla schermata Home"</span></p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/30 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">3</div>
            <p className="text-xs text-white/90 leading-snug">Conferma con <span className="font-bold">"Aggiungi"</span> ✅</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-4 bg-gradient-to-br from-[#2D6A4F] to-[#1a4d38] rounded-2xl p-4 shadow-xl border border-white/10 text-white">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Installa l'app gratis 📱</p>
          <p className="text-xs text-white/80 mt-0.5 leading-snug">
            Accesso rapido + notifiche giornaliere delle ricette
          </p>
          <button
            onClick={handleInstall}
            className="mt-2.5 flex items-center gap-1.5 bg-white/95 text-[#2D6A4F] text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-lg hover:bg-white"
          >
            <span>👆</span>
            Installa ora
          </button>
        </div>
        <button onClick={handleDismiss} className="text-white/50 hover:text-white/80 p-1 -mt-1 -mr-1 flex-shrink-0 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}