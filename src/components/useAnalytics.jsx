import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";

// Generate or retrieve session ID (per browser session)
function getSessionId() {
  let sid = sessionStorage.getItem("gp_session_id");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("gp_session_id", sid);
  }
  return sid;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Colunas de dados EXTRAS aceitas pela tabela app_analytics. Qualquer chave fora
// desta lista é DESCARTADA antes do insert — o PostgREST rejeita a linha inteira se
// receber uma coluna inexistente, o que fazia eventos sumirem em silêncio (ex.:
// post_id/cta_url/product/mode). Aqui o evento sempre grava com os campos válidos.
const ANALYTICS_COLUMNS = new Set([
  "session_duration_seconds", "recipe_id", "recipe_title", "scroll_percentage",
  "occasion_label", "source", "duration_seconds", "load_time_ms", "results_count",
  "notification_id",
]);

// Track a single event (fire and forget — never throws).
// Insere DIRETO via supabase, SEM .select() — a policy de SELECT da app_analytics
// é só-admin, então o read-back falhava e fazia o evento se perder pra todo usuário
// não-admin. Com user_id explícito (= auth.uid()) o RLS de INSERT passa pra todos.
export async function trackEvent(eventType, extra = {}) {
  try {
    const user_email = sessionStorage.getItem("gp_user_email") || null;
    const user_plan = sessionStorage.getItem("gp_user_plan") || "free";
    let user_id = sessionStorage.getItem("gp_user_id") || null;
    if (!user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      user_id = user?.id || null;
      if (user_id) sessionStorage.setItem("gp_user_id", user_id);
    }
    if (!user_id) return; // sem sessão → o RLS bloquearia mesmo; não insiste

    // Só passa colunas que existem na tabela (evita rejeição silenciosa da linha)
    const safeExtra = {};
    for (const [k, v] of Object.entries(extra || {})) {
      if (!ANALYTICS_COLUMNS.has(k) || v === undefined) continue;
      safeExtra[k] = k === "occasion_label" && typeof v === "string" ? v.slice(0, 120) : v;
    }

    await supabase.from("app_analytics").insert({
      event_type: eventType,
      user_id,
      user_email,
      user_plan,
      session_id: getSessionId(),
      date: todayStr(),
      ...safeExtra,
    });
  } catch {}
}

// Track a click on a labeled element (button, card, link).
// `target` is a short stable label; `extra` can carry source/recipe_id/etc.
export function trackClick(target, extra = {}) {
  if (!target) return;
  trackEvent("click", { occasion_label: String(target).slice(0, 80), ...extra });
}

// Hook: global click delegation — any element with [data-track="label"] is counted
// automatically. Lets us instrument new buttons by just adding the attribute.
export function useClickTracking() {
  useEffect(() => {
    const onClick = (ev) => {
      const el = ev.target?.closest?.("[data-track]");
      if (!el) return;
      const label = el.getAttribute("data-track");
      if (!label) return;
      const extra = {};
      if (el.dataset.trackSource) extra.source = el.dataset.trackSource;
      trackClick(label, extra);
    };
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
}

// Hook: tracks session_start once per browser session, and session_end on page close
export function useSessionTracking() {
  const startRef = useRef(Date.now());

  useEffect(() => {
    const sessionId = getSessionId();
    const alreadyStarted = sessionStorage.getItem("gp_session_started");

    if (!alreadyStarted) {
      sessionStorage.setItem("gp_session_started", "1");

      // Capture UTM params BEFORE auth (they come from URL, not auth)
      const urlParams = new URLSearchParams(window.location.search);
      let utmSource = urlParams.get("utm_source");
      let utmMedium = urlParams.get("utm_medium");
      let utmCampaign = urlParams.get("utm_campaign");

      // Fallback: detect Instagram/TikTok in-app browser via user agent (they strip UTMs)
      if (!utmSource) {
        const ua = navigator.userAgent || "";
        if (/Instagram/i.test(ua)) utmSource = "instagram";
        else if (/musical_ly|TikTok/i.test(ua)) utmSource = "tiktok";
        else if (/FBAN|FBAV|FB_IAB/i.test(ua)) utmSource = "facebook";
      }

      // Fallback: detect referrer (e.g. from Google search)
      if (!utmSource && document.referrer) {
        try {
          const ref = new URL(document.referrer).hostname;
          if (ref.includes("google")) utmSource = "google";
          else if (ref.includes("instagram")) utmSource = "instagram";
          else if (ref.includes("tiktok")) utmSource = "tiktok";
          else if (ref.includes("facebook")) utmSource = "facebook";
          else if (ref.includes("pinterest")) utmSource = "pinterest";
          else if (ref.includes("youtube")) utmSource = "youtube";
        } catch {}
      }

      // Persist UTM in localStorage so it survives navigation within the session
      if (utmSource) {
        localStorage.setItem("gp_last_utm_source", utmSource);
        localStorage.setItem("gp_last_utm_date", todayStr());
        sessionStorage.setItem("gp_utm_source", utmSource);
        if (utmMedium) sessionStorage.setItem("gp_utm_medium", utmMedium);
        if (utmCampaign) sessionStorage.setItem("gp_utm_campaign", utmCampaign);
      } else {
        // Recover UTM from localStorage if from today (user navigated internally)
        const savedUtm = localStorage.getItem("gp_last_utm_source");
        const savedDate = localStorage.getItem("gp_last_utm_date");
        if (savedUtm && savedDate === todayStr()) {
          utmSource = savedUtm;
        }
      }

      // Only fire utm_visit when UTM came from the actual URL/UA (not recovered from localStorage)
      const utmFromUrl = !!urlParams.get("utm_source") || (
        !urlParams.get("utm_source") && (() => {
          const ua = navigator.userAgent || "";
          return /Instagram/i.test(ua) || /musical_ly|TikTok/i.test(ua) || /FBAN|FBAV|FB_IAB/i.test(ua);
        })()
      ) || (
        !urlParams.get("utm_source") && !!document.referrer && (() => {
          try {
            const ref = new URL(document.referrer).hostname;
            return ref.includes("google") || ref.includes("instagram") || ref.includes("tiktok") ||
              ref.includes("facebook") || ref.includes("pinterest") || ref.includes("youtube");
          } catch { return false; }
        })()
      );

      // CRITICAL: Wait for auth FIRST, then fire events so user_email is cached
      const doInit = async () => {
        try {
          const u = await base44.auth.me();
          if (u?.id) sessionStorage.setItem("gp_user_id", u.id);
          if (u?.email) sessionStorage.setItem("gp_user_email", u.email);
          if (u?.plan) sessionStorage.setItem("gp_user_plan", u.plan);
        } catch {}

        // Now fire events — user_email is already in sessionStorage
        // Only fire utm_visit when user actually came from UTM (not recovered from localStorage)
        if (utmSource && utmFromUrl) {
          trackEvent("utm_visit", {
            occasion_label: utmSource,
            source: [utmMedium, utmCampaign].filter(Boolean).join(" / ") || utmSource,
          });
        }
        trackEvent("session_start", utmSource ? { source: utmSource } : {});

        // Track if opened as installed PWA (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
          || window.navigator.standalone === true;
        if (isStandalone) {
          trackEvent("pwa_install_click", { occasion_label: "pwa_opened_installed" });
        }
      };
      doInit();
    }

    // Track session_end only ONCE: on pagehide (tab close / navigate away).
    // Do NOT fire on visibilitychange — mobile apps go background constantly
    // which would create dozens of fake session_end events and inflate counts.
    const handleEnd = () => {
      // Prevent double-firing (pagehide can fire after visibilitychange on some browsers)
      if (sessionStorage.getItem("gp_session_ended")) return;
      sessionStorage.setItem("gp_session_ended", "1");
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      if (duration < 3) return;
      trackEvent("session_end", { session_duration_seconds: duration });
    };

    window.addEventListener("pagehide", handleEnd);
    return () => {
      window.removeEventListener("pagehide", handleEnd);
    };
  }, []);
}