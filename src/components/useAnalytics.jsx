import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

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

// Track a single event (fire and forget — never throws)
export async function trackEvent(eventType, extra = {}) {
  try {
    // Use cached user data from session to avoid extra network requests
    const user_email = sessionStorage.getItem("gp_user_email") || null;
    const user_plan = sessionStorage.getItem("gp_user_plan") || "free";
    await base44.entities.AppAnalytics.create({
      event_type: eventType,
      user_email,
      user_plan,
      session_id: getSessionId(),
      date: todayStr(),
      ...extra,
    });
  } catch {}
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

      // CRITICAL: Wait for auth FIRST, then fire events so user_email is cached
      const doInit = async () => {
        try {
          const u = await base44.auth.me();
          if (u?.email) sessionStorage.setItem("gp_user_email", u.email);
          if (u?.plan) sessionStorage.setItem("gp_user_plan", u.plan);
        } catch {}

        // Now fire events — user_email is already in sessionStorage
        if (utmSource) {
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

    const handleEnd = () => {
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      if (duration < 3) return;
      // Use sendBeacon for reliability on mobile/PWA close
      const user_email = sessionStorage.getItem("gp_user_email") || null;
      const user_plan = sessionStorage.getItem("gp_user_plan") || "free";
      const payload = JSON.stringify({
        event_type: "session_end",
        user_email,
        user_plan,
        session_id: getSessionId(),
        date: todayStr(),
        session_duration_seconds: duration,
      });
      // Fire via normal trackEvent as well (best effort)
      trackEvent("session_end", { session_duration_seconds: duration });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") handleEnd();
    };

    window.addEventListener("pagehide", handleEnd);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", handleEnd);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}