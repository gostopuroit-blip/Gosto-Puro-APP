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
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    await base44.entities.AppAnalytics.create({
      event_type: eventType,
      user_email: user?.email || null,
      user_plan: user?.plan || "free",
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
      trackEvent("session_start");
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