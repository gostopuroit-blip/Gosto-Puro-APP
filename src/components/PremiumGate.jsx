import { Lock } from "lucide-react";

const PREMIUM_LINK = "https://gostopuro.it/upgrade/";

// Tem acesso = premium completo OU comprou qualquer raccolta (has_access vem do auth.me).
function userHasAccess(user) {
  return user?.has_access === true || user?.is_full_premium === true || user?.is_premium === true;
}

// Tela de cadeado reutilizável (Cartelle, Planner, etc.)
export function PremiumLock({ feature = "questa funzione", link = PREMIUM_LINK }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center mb-4">
        <Lock className="w-9 h-9 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Funzione Premium 🔒</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        Per usare {feature} serve aver acquistato almeno una raccolta Gosto Puro. Sbloccala e organizza le tue ricette!
      </p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-[#2D6A4F] text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform"
      >
        🔓 Sblocca l'accesso
      </a>
    </div>
  );
}

export default function PremiumGate({ children, user, feature = "questa funzione" }) {
  if (userHasAccess(user)) return children;
  return <PremiumLock feature={feature} />;
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
