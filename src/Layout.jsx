import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home, BookOpen, FolderHeart, CalendarDays, UserCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const navItems = [
{ name: "Home", icon: Home, page: "Home" },
{ name: "Ricette", icon: BookOpen, page: "Recipes" },
{ name: "Cartelle", icon: FolderHeart, page: "Folders" },
{ name: "Planner", icon: CalendarDays, page: "Planner" },
{ name: "Profilo", icon: UserCircle2, page: "Profile" }];


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F] flex flex-col">
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

      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/c0529d754_headerapp.png" alt="Gosto Puro" className="pr-32 pl-32 w-full object-contain" />
      
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