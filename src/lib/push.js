// Utilitário central de Web Push: detecção de suporte + inscrição.
// Reusado pelo NotificationNudge global e pela tela Profilo.
import { base44 } from "@/api/base44Client";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  const ua = window.navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se apresenta como Mac; detecta pelo touch
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export function hasPushApi() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// Descreve o que dá pra fazer neste dispositivo agora.
export function pushSupport() {
  const api = hasPushApi();
  const ios = isIOS();
  const standalone = isStandalone();
  // No iOS o push SÓ funciona com o app instalado (standalone) e iOS 16.4+.
  const canSubscribe = api && (!ios || standalone);
  return {
    api,
    ios,
    standalone,
    canSubscribe,
    // iOS no navegador: precisa instalar antes de poder receber push
    needsInstallFirst: ios && !standalone,
    permission: api ? Notification.permission : "unsupported", // default | granted | denied
  };
}

// Fluxo completo: pede permissão, assina no PushManager e salva no servidor.
// Retorna "granted" | "denied" | "unsupported" | "error".
export async function enablePush() {
  if (!hasPushApi()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    // VAPID vem do backend (não fica hardcoded no cliente)
    const keyRes = await base44.functions.invoke("getVapidPublicKey");
    const vapidPublicKey = keyRes.data?.publicKey;
    if (!vapidPublicKey) return "error";

    const registration = await navigator.serviceWorker.ready;
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    const { endpoint, keys } = sub.toJSON();
    await base44.functions.invoke("savePushSubscription", {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    return "granted";
  } catch {
    return "error";
  }
}
