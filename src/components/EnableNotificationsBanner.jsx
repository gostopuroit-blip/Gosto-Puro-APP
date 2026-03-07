import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function EnableNotificationsBanner() {
  const [status, setStatus] = useState("idle"); // idle | asking | subscribed | denied | unsupported
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    // In PWA standalone mode, ignore the "dismissed" flag — always re-offer notifications
    if (!isStandalone && localStorage.getItem("notif_dismissed")) {
      setDismissed(true);
      return;
    }

    if (Notification.permission === "granted") {
      setStatus("subscribed");
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    }
  }, []);

  const handleEnable = async () => {
    setStatus("asking");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      // Fetch VAPID public key from backend (avoids hardcoding in frontend)
      const keyRes = await base44.functions.invoke("getVapidPublicKey");
      const vapidPublicKey = keyRes.data?.publicKey;
      if (!vapidPublicKey) throw new Error("VAPID key not available");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const { endpoint, keys } = subscription.toJSON();
      await base44.functions.invoke("savePushSubscription", {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscription error:", err);
      setStatus("denied");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("notif_dismissed", "1");
    setDismissed(true);
  };

  if (dismissed || status === "unsupported" || status === "subscribed") return null;

  return (
    <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Ricevi le ricette del giorno</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Attiva le notifiche per ricevere ogni giorno Colazione, Pranzo e Cena direttamente sul telefono.
          </p>
          {status === "denied" ? (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <BellOff className="w-3 h-3" /> Notifiche bloccate — abilitale dalle impostazioni del browser
            </p>
          ) : (
            <button
              onClick={handleEnable}
              disabled={status === "asking"}
              className="mt-2.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg active:bg-amber-200 transition-colors disabled:opacity-50"
            >
              {status === "asking" ? "Attivazione..." : "Attiva notifiche"}
            </button>
          )}
        </div>
        <button onClick={handleDismiss} className="text-gray-400 active:text-gray-600 flex-shrink-0 mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}