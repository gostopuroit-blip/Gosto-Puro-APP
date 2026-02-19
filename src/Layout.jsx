import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home, BookOpen, FolderHeart, CalendarDays, UserCircle2 } from "lucide-react";

const navItems = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Ricette", icon: BookOpen, page: "Recipes" },
  { name: "Cartelle", icon: FolderHeart, page: "Folders" },
  { name: "Planner", icon: CalendarDays, page: "Planner" },
  { name: "Profilo", icon: UserCircle2, page: "Profile" },
];

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
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
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--gusto-cream);
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <main className="flex-1 pb-24 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-50">
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
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
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