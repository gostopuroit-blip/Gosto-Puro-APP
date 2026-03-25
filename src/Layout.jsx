import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home, BookOpen, FolderHeart, CalendarDays, UserCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useSessionTracking, trackEvent } from "@/components/useAnalytics";

const navItems = [
{ name: "Home", icon: Home, page: "Home" },
{ name: "Ricette", icon: BookOpen, page: "Recipes" },
{ name: "Cartelle", icon: FolderHeart, page: "Folders" },
{ name: "Planner", icon: CalendarDays, page: "Planner" },
{ name: "Profilo", icon: UserCircle2, page: "Profile" }];

const communityPages = ["Community", "ExpertProfile"];


// Capture PWA install prompt globally as early as possible
if (typeof window !== "undefined") {
  window.__pwaInstallPrompt = window.__pwaInstallPrompt || null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__pwaInstallPrompt = e;
  });
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  useSessionTracking();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      // Track login once per session
      if (u?.email && !sessionStorage.getItem("gp_login_tracked")) {
        sessionStorage.setItem("gp_login_tracked", "1");
        trackEvent("login");
      }
      // Prioriza preferência salva no perfil do usuário
      if (u?.dark_mode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else if (u && !u.dark_mode) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        // Fallback para localStorage se não autenticado
        const theme = localStorage.getItem("theme");
        if (theme === "dark") document.documentElement.classList.add("dark");
      }
    }).catch(() => {
      setUser(null);
      const theme = localStorage.getItem("theme");
      if (theme === "dark") document.documentElement.classList.add("dark");
    });
  }, []);

  useEffect(() => {
    trackEvent("screen_load", { occasion_label: currentPageName });
  }, [currentPageName]);

  useEffect(() => {
    // Recarrega o usuário sempre que navegar para a página Profile
    if (currentPageName === "Profile") {
      const timer = setTimeout(() => {
        base44.auth.me().then(setUser).catch(() => setUser(null));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPageName]);

  // Admin page gets its own full-screen layout — no banner, no bottom nav
  if (currentPageName === "Admin") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F] flex flex-col overflow-x-hidden">
      <style>{`
        :root {
          --gusto-green: #2D6A4F;
          --gusto-green-light: #40916C;
          --gusto-cream: #FAFAF8;
          --gusto-warm: #F5F0EB;
          --gusto-text: #1A1A1A;
          --gusto-text-secondary: #6B6B6B;
          --gusto-orange: #E07A3A;
          --gusto-gold: #D4A846;
          --gusto-bg: #FAFAF8;
          --gusto-surface: #FFFFFF;
          --gusto-border: #F3F4F6;
          --gusto-text-primary: #111827;
          --gusto-text-muted: #6B7280;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --gusto-cream: #0F0F0F;
            --gusto-bg: #0F0F0F;
            --gusto-surface: #1A1A1A;
            --gusto-border: #333333;
            --gusto-text-primary: #E5E5E5;
            --gusto-text-muted: #9CA3AF;
            --gusto-warm: #1A1A1A;
          }
        }
        input:focus, textarea:focus, select:focus {
          background-color: inherit !important;
          color: inherit !important;
        }
        input::placeholder, textarea::placeholder {
          color: var(--gusto-text-muted) !important;
          opacity: 1;
        }
        @media (prefers-color-scheme: dark) {
          input, textarea, select {
            background-color: #1A1A1A !important;
            color: #E5E5E5 !important;
            border-color: #333333 !important;
          }
          input::placeholder, textarea::placeholder {
            color: #6B7280 !important;
          }
        }
        @media (prefers-color-scheme: light) {
          input, textarea, select {
            background-color: #FFFFFF !important;
            color: #1A1A1A !important;
            border-color: #E5E7EB !important;
          }
          input::placeholder, textarea::placeholder {
            color: #9CA3AF !important;
          }
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--gusto-bg);
          overscroll-behavior: none;
        }
        button, a {
          user-select: none;
          -webkit-user-select: none;
        }
        svg {
          user-select: none;
          -webkit-user-select: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="flex justify-center w-full flex-shrink-0">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/9b8fdd3a5_image.png" alt="Gosto Puro" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      
      <main className="flex-1 pb-24 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname + location.search}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}>

            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border-t border-gray-100 dark:border-[#333333] z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center py-2 px-2">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
                isActive ?
                "text-[#2D6A4F] dark:text-[#888888]" :
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`
                }>

                <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"}`} />
                <span className={`text-[13px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {item.name}
                </span>
                {isActive &&
                <div className="w-1 h-1 rounded-full bg-[#2D6A4F] dark:bg-[#888888] mt-0.5" />
                }
              </Link>);

          })}
        </div>
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>);

}