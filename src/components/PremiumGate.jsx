import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Crown, Lock } from "lucide-react";

export default function PremiumGate({ children, user, feature = "questa funzionalità" }) {
  const isPremium = user?.plan === "premium" || user?.role === "admin";

  if (isPremium) return children;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="pointer-events-none opacity-20 select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 py-8 text-center bg-black/10 dark:bg-black/40">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mb-4">
          <Crown className="w-7 h-7 text-amber-500" />
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Funzionalità Premium</p>
        <p className="text-gray-700 mb-6 text-base font-semibold text-center leading-relaxed dark:text-gray-200">
          Sblocca {feature} con il piano Premium
        </p>
        <a
          href="https://pay.hotmart.com/L104095305F?off=y6zj0nlm&checkoutMode=10"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-amber-400 text-neutral-950 px-6 py-3 text-sm font-bold rounded-xl hover:bg-amber-500 transition-colors">
          <Crown className="w-4 h-4" />
          Sblocca Premium
        </a>
      </div>
    </div>);

}

export function PremiumBadge({ user }) {
  if (user?.role === "admin") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
      👑 Admin
    </span>);

  if (user?.plan === "premium") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
      ✨ Premium
    </span>);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
      Base
    </span>);

}