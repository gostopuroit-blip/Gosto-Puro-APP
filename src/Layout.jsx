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
  { name: "Profilo", icon: UserCircle2, page: "Profile" },
];

function PremiumBadge({ user }) {
  if (!user) return null;

  const roleConfig = {
    admin: { label: "👑 Admin", color: "bg-purple-500" },
    premium: { label: "⭐ Premium", color: "bg-amber-500" },
  };

  const hasRole = user.role === "admin" || user.role === "premium";
  const config = roleConfig[user.role];

  if (!hasRole) {
    return (
      <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-400">
        Free
      </div>
    );
  }

  return (
    <div className={`${config.color} px-3 py-1.5 rounded-full text-xs font-semibold text-white`}>
      {config.label}
    </div>
  );
}

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
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F1A14] flex flex-col">
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
            --gusto-cream: #0F1A14;
            --gusto-bg: #0F1A14;
            --gusto-surface: #1A2B20;
            --gusto-border: #2D4A38;
            --gusto-text-primary: #F1F5F2;
            --gusto-text-muted: #8FA896;
            --gusto-warm: #1A2B20;
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
      
      <main className="flex-1 pb-24 max-w-lg mx-auto w-full pt-[env(safe-area-inset-top)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname + location.search}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1A2B20]/95 backdrop-blur-xl border-t border-gray-100 dark:border-[#2D4A38] z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center py-2 px-2">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "text-[#2D6A4F]" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"}`} />
                <span className={`text-[13px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {item.name}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[#2D6A4F] mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>
  );
}