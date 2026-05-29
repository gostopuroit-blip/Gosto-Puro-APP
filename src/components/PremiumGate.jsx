
export default function PremiumGate({ children }) {
  // OPEN ACCESS: sem bloqueio premium
  return children;
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