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
export function formatTimeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const diffMs = now - d;
  if (diffMs < 0) return "adesso"; // future date guard
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "adesso";
  if (diffMin < 60) return `${diffMin} minut${diffMin === 1 ? "o" : "i"} fa`;
  if (diffHours < 24) return `${diffHours} or${diffHours === 1 ? "a" : "e"} fa`;
  if (diffDays < 7) return `${diffDays} giorn${diffDays === 1 ? "o" : "i"} fa`;

  // 7+ giorni → data "gg MMM"
  const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}