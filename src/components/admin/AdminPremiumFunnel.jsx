export default function AdminPremiumFunnel({ events }) {
  const premiumViews = new Set(
    events.filter(e => e.event_type === "premium_view" && e.user_email).map(e => e.user_email)
  ).size;
  const premiumClicks = new Set(
    events.filter(e => e.event_type === "premium_click" && e.user_email).map(e => e.user_email)
  ).size;
  const premiumPurchases = new Set(
    events.filter(e => e.event_type === "premium_purchase" && e.user_email).map(e => e.user_email)
  ).size;

  // Also count users that are premium from plan field (indirect purchase evidence)
  const premiumFromPlan = new Set(
    events.filter(e => e.user_plan === "premium" && e.user_email).map(e => e.user_email)
  ).size;

  const steps = [
    { label: "Viram paywall", value: premiumViews, color: "bg-blue-400", emoji: "👁" },
    { label: "Clicaram em upgrade", value: premiumClicks, color: "bg-amber-400", emoji: "👆" },
    { label: "Compraram (evento)", value: premiumPurchases, color: "bg-green-500", emoji: "💳" },
    { label: "Usuários premium", value: premiumFromPlan, color: "bg-[#2D6A4F]", emoji: "✨" },
  ];

  const maxVal = Math.max(...steps.map(s => s.value), 1);

  const conversionRate = premiumViews > 0
    ? ((premiumFromPlan / premiumViews) * 100).toFixed(1)
    : "—";

  const clickRate = premiumViews > 0
    ? ((premiumClicks / premiumViews) * 100).toFixed(1)
    : "—";

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-5 text-base text-center flex-shrink-0">{step.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-700 font-semibold">{step.label}</p>
              <span className="text-xs font-bold text-gray-900">{step.value}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`${step.color} h-2 rounded-full transition-all`}
                style={{ width: `${Math.max(4, Math.round((step.value / maxVal) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{clickRate}%</p>
          <p className="text-[10px] text-gray-500">Taxa de clique</p>
          <p className="text-[9px] text-gray-400">viu → clicou upgrade</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-700">{conversionRate}%</p>
          <p className="text-[10px] text-gray-500">Taxa de conversão</p>
          <p className="text-[9px] text-gray-400">viu paywall → virou premium</p>
        </div>
      </div>
    </div>
  );
}