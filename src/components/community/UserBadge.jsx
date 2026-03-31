// Reusable badge component for user roles/plans
export default function UserBadge({ role, plan, isExpert, size = "sm" }) {
  const textClass = size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";

  if (role === "admin") {
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 ${textClass}`}>
        👑 Admin
      </span>
    );
  }

  if (isExpert) {
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full font-bold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 ${textClass}`}>
        ✅ Expert
      </span>
    );
  }

  if (plan === "premium" || role === "premium") {
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ${textClass}`}>
        ⭐ Premium
      </span>
    );
  }

  return null;
}