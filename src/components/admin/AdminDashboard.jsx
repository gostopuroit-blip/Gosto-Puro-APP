import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, BookOpen, Heart, ChefHat, AlertCircle, Plus, Loader2 } from "lucide-react";

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [users, recipes, webhooks] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Recipe.list("-numero_salvate", 100),
      base44.entities.WebhookLog.filter({ status: "error" }),
    ]);

    const now = Date.now();
    const h24 = webhooks.filter((w) => new Date(w.timestamp || w.created_date).getTime() > now - 86400000);

    const topSaved = [...recipes].sort((a, b) => (b.numero_salvate || 0) - (a.numero_salvate || 0)).slice(0, 5);
    const topPrepared = [...recipes].sort((a, b) => (b.numero_preparate || 0) - (a.numero_preparate || 0)).slice(0, 5);

    setStats({
      totalUsers: users.length,
      premiumUsers: users.filter((u) => u.plan === "premium").length,
      freeUsers: users.filter((u) => !u.plan || u.plan === "free").length,
      totalRecipes: recipes.length,
      topSaved,
      topPrepared,
      webhookErrors24h: h24.length,
    });
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>;

  const cards = [
    { label: "Utenti totali", value: stats.totalUsers, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Premium attivi", value: stats.premiumUsers, icon: "✨", color: "bg-amber-50 text-amber-600", emoji: true },
    { label: "Free attivi", value: stats.freeUsers, icon: "👤", color: "bg-gray-50 text-gray-600", emoji: true },
    { label: "Ricette totali", value: stats.totalRecipes, icon: BookOpen, color: "bg-green-50 text-green-600" },
    { label: "Errori webhook 24h", value: stats.webhookErrors24h, icon: AlertCircle, color: "bg-red-50 text-red-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, i) => (
          <div key={i} className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ${i === cards.length - 1 && cards.length % 2 !== 0 ? "col-span-2" : ""}`}>
            <div className={`w-9 h-9 rounded-xl ${c.color} flex items-center justify-center mb-2`}>
              {c.emoji ? <span className="text-base">{c.icon}</span> : <c.icon className="w-4 h-4" />}
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <Link
        to={createPageUrl("Admin?tab=ricette")}
        className="flex items-center gap-3 bg-[#2D6A4F] text-white rounded-2xl p-4 shadow-lg shadow-[#2D6A4F]/20 active:scale-[0.98] transition-transform"
      >
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-sm">Crea nuova ricetta</p>
          <p className="text-xs text-white/70">Aggiungi al catalogo</p>
        </div>
      </Link>

      {/* Top saved */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">🏆 Più salvate</p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {stats.topSaved.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${i < stats.topSaved.length - 1 ? "border-b border-gray-50" : ""}`}>
              <span className="text-sm font-bold text-gray-300 w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <Heart className="w-3.5 h-3.5 fill-rose-400" />
                <span className="text-xs font-bold">{r.numero_salvate || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top prepared */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">👨‍🍳 Più preparate</p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {stats.topPrepared.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${i < stats.topPrepared.length - 1 ? "border-b border-gray-50" : ""}`}>
              <span className="text-sm font-bold text-gray-300 w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
              </div>
              <div className="flex items-center gap-1 text-[#2D6A4F]">
                <ChefHat className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{r.numero_preparate || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}