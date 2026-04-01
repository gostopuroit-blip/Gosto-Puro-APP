/**
 * Determina il badge da mostrare in base a role/plan/is_expert dell'utente.
 * Priorità: admin > expert > premium > basic
 */
export function getUserBadge(user) {
  if (!user) return { label: "Basic", color: "text-gray-400", bg: null };
  const role = user.role;
  const plan = user.plan;
  const isExpert = user.is_expert;

  if (role === "admin") {
    return { label: "👑 Admin", color: "text-purple-600", bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" };
  }
  if (isExpert === true || role === "expert") {
    return { label: "✅ Expert", color: "text-[#2D6A4F]", bg: "bg-green-100 text-[#2D6A4F] dark:bg-green-950/40 dark:text-green-300" };
  }
  if (plan === "premium" || role === "premium") {
    return { label: "⭐ Premium", color: "text-amber-600", bg: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
  }
  return { label: "Basic", color: "text-gray-400", bg: null };
}

/**
 * Formatta una data in italiano senza "circa" o "tra"
 */
export function formatTimeAgo(post) {
  const date = typeof post === 'string' || post instanceof Date ? post : post?.created_date;
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));

  if (diff < 60) return "adesso";
  if (diff < 3600) return `${Math.floor(diff / 60)} minuti fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ore fa`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} giorni fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}