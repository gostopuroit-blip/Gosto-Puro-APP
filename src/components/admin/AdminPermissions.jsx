
const plans = [
  {
    key: "free",
    label: "Free",
    icon: "👤",
    color: "bg-gray-50 border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    features: [
      "✅ Visualizzare ricette base",
      "✅ Salvataggio ricette (1 cartella)",
      "✅ Cerca e filtra ricette",
      "✅ Valutare ricette",
      "❌ Occasioni Speciali",
      "❌ Planner 1-click",
      "❌ Lista della spesa",
      "❌ Cartelle illimitate",
      "❌ Ricette Premium",
    ],
  },
  {
    key: "premium",
    label: "Premium",
    icon: "✨",
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    features: [
      "✅ Tutto del piano Free",
      "✅ Occasioni Speciali",
      "✅ Planner 1-click",
      "✅ Lista della spesa completa",
      "✅ Cartelle illimitate",
      "✅ Ricette Premium",
      "✅ Stile di vita avanzato",
    ],
  },
  {
    key: "admin",
    label: "Admin",
    icon: "👑",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    features: [
      "✅ Tutto del piano Premium",
      "✅ Pannello Admin",
      "✅ Gestione utenti",
      "✅ CRUD ricette",
      "✅ Gestione occasioni",
      "✅ Webhook & Logs",
      "✅ Impostazioni app",
    ],
  },
];

export default function AdminPermissions() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Panoramica dei permessi per piano</p>
      {plans.map((plan) => (
        <div key={plan.key} className={`rounded-2xl border p-4 ${plan.color}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{plan.icon}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${plan.badge}`}>{plan.label}</span>
          </div>
          <div className="space-y-1.5">
            {plan.features.map((f, i) => (
              <p key={i} className={`text-xs ${f.startsWith("❌") ? "text-gray-400" : "text-gray-700 font-medium"}`}>{f}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}