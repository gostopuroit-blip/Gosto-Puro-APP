// Helper to give the user the *right* PWA install instructions for their
// device/browser. The green "Installa" button only appears when the browser
// fires `beforeinstallprompt` (Android Chrome/Edge). For everyone else we must
// show platform-specific manual steps — or tell them to leave an in-app
// browser that can't install PWAs at all.

export function getInstallContext() {
  if (typeof navigator === "undefined") {
    return { isStandalone: false, isIOS: false, isAndroid: false, isInApp: false, isIOSSafari: false };
  }
  const ua = navigator.userAgent || "";
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
  const isAndroid = /android/i.test(ua);
  // In-app browsers / webviews that cannot install a PWA.
  const isInApp =
    /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|Snapchat|Pinterest|Telegram|MicroMessenger|FB_IAB|; wv\)/i.test(ua);
  const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return { isStandalone, isIOS, isAndroid, isInApp, isIOSSafari };
}

// Returns the manual-instruction text (Italian) to show when there is no
// install prompt available, tailored to the user's context.
export function getInstallHint() {
  const { isIOS, isAndroid, isInApp, isIOSSafari } = getInstallContext();

  if (isInApp) {
    return "Apri questa pagina in Chrome o Safari per installare (tocca il menu ⋮ → “Apri nel browser”).";
  }
  if (isIOS) {
    return isIOSSafari
      ? "Tocca Condividi in basso, poi “Aggiungi alla schermata Home”."
      : "Apri questa pagina in Safari, poi Condividi → “Aggiungi alla schermata Home”.";
  }
  if (isAndroid) {
    return "Tocca il menu ⋮ in alto a destra, poi “Installa app” (o “Aggiungi a schermata Home”).";
  }
  return "Usa il menu del tuo browser e scegli “Installa app” / “Aggiungi alla Home”.";
}
