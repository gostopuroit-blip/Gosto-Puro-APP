// PWA service worker registration with reliable auto-update.
//
// The default vite-plugin-pwa "auto" register script only *registers* the SW —
// it never reloads the page, so users stayed on the old bundle after a deploy
// until they manually refreshed (twice). Here we register, poll for new
// versions, and reload exactly once when a new SW takes control.
export function registerPWA() {
  if (!("serviceWorker" in navigator)) return;

  // Only auto-reload on an actual update (page was already controlled by a SW),
  // never on the very first install — and never more than once (no reload loop).
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw-push.js", { scope: "/" })
      .then((reg) => {
        const check = () => reg.update().catch(() => {});
        // Re-check whenever the user comes back to the app (covers reopening
        // an installed PWA) and as a safety net once an hour.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        setInterval(check, 60 * 60 * 1000);
      })
      .catch(() => {});
  });
}
