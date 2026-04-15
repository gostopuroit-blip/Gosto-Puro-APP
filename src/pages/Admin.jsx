import { useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminRecipesManager from "@/components/admin/AdminRecipesManager";
import AdminRecipeGenerator from "@/components/admin/AdminRecipeGenerator";
import AdminPermissions from "@/components/admin/AdminPermissions";
import AdminWebhooks from "@/components/admin/AdminWebhooks";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminEngagement from "@/components/admin/AdminEngagement";
import AdminRecipeEngagement from "@/components/admin/AdminRecipeEngagement";
import AdminEmailTemplates from "@/components/admin/AdminEmailTemplates";
import AdminAnalyticsReport from "@/components/admin/AdminAnalyticsReport";
import AdminUTMGenerator from "@/components/admin/AdminUTMGenerator";
import AdminEbookUTMs from "@/components/admin/AdminEbookUTMs";
import AdminEbookFollowup from "@/components/admin/AdminEbookFollowup";
import AdminPremiumIntelligence from "@/components/admin/AdminPremiumIntelligence";
import AdminBaseFreeRecipes from "@/components/admin/AdminBaseFreeRecipes";
import AdminRecipeIngredientAudit from "@/components/admin/AdminRecipeIngredientAudit";
import AdminUserProducts from "@/components/admin/AdminUserProducts";
import AdminGostoPuroProducts from "@/components/admin/AdminGostoPuroProducts";
import AdminDietaryTagsBulk from "@/components/admin/AdminDietaryTagsBulk";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, LayoutDashboard, TrendingUp, BarChart2, Users, UtensilsCrossed, Sparkles, Bell, Lock, Webhook, Settings, Mail, FileBarChart, Link2, BookOpen, Crown, Gift, Filter, Package, Tag } from "lucide-react";

const tabs = [
  { key: "dashboard",    label: "Dashboard",      icon: LayoutDashboard },
  { key: "engagement",   label: "Analytics",       icon: TrendingUp },
  { key: "recipeanalytics", label: "Recipe Analytics", icon: BarChart2 },
  { key: "report",         label: "Rapporto",         icon: FileBarChart },
  { key: "utm",            label: "Link UTM",          icon: Link2 },
  { key: "utenti",       label: "Utenti",        icon: Users },
  { key: "ricette",      label: "Ricette",        icon: UtensilsCrossed },
  { key: "audit_ingredients", label: "Audit Ingredienti", icon: Filter },
  { key: "dietary_tags_bulk", label: "Tag Dietetici", icon: Tag },
  { key: "genera",       label: "Genera con IA",    icon: Sparkles },
  { key: "base_free",    label: "Ricette Base",   icon: Gift },
  { key: "emails",       label: "Template Email",  icon: Mail },
  { key: "notifiche",    label: "Notifiche",    icon: Bell },
  { key: "permessi",     label: "Permessi",      icon: Lock },
  { key: "webhooks",     label: "Webhook",        icon: Webhook },
  { key: "ebook",          label: "E-book Followup",  icon: BookOpen },
  { key: "premium_intel", label: "Intelligence Premium",    icon: Crown },
  { key: "user_products",  label: "Prodotti Utenti", icon: Package },
  { key: "gp_products",    label: "Prodotti GP",    icon: Package },
  { key: "impostazioni", label: "Impostazioni",   icon: Settings },
];

function AdminContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);

  const activeLabel = tabs.find(t => t.key === activeTab)?.label || "";

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 h-screen fixed top-0 left-0 z-40 overflow-hidden">
        {/* Logo / título */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👑</span>
            <span className="font-bold text-gray-900 text-sm">Pannello Admin</span>
          </div>
          <p className="text-[10px] text-gray-400">Gosto Puro</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto min-h-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-purple-600" : "text-gray-400"}`} />
                {t.label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />}
              </button>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="px-3 py-4 border-t border-gray-100">
          <Link
            to={createPageUrl("Profile")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna all'app
          </Link>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile back */}
            <Link
              to={createPageUrl("Profile")}
              className="md:hidden w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">{activeLabel}</h1>
              <p className="text-[11px] text-gray-400 hidden md:block">Pannello amministrativo · Gosto Puro</p>
            </div>
          </div>
          {/* Mobile tab pills */}
          <div className="flex md:hidden gap-1.5 overflow-x-auto hide-scrollbar max-w-[60vw]">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-shrink-0 p-2 rounded-xl transition-all ${
                    activeTab === t.key
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                  title={t.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {activeTab === "dashboard"    && <AdminDashboard onNavigate={setActiveTab} />}
          {activeTab === "engagement"   && <AdminEngagement />}
          {activeTab === "recipeanalytics" && <AdminRecipeEngagement />}
          {activeTab === "report"         && <AdminAnalyticsReport />}
          {activeTab === "utm"            && (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">📱 Social / Canais</p>
                <AdminUTMGenerator />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">📚 E-books</p>
                <AdminEbookUTMs />
              </div>
            </div>
          )}
          {activeTab === "utenti"       && <AdminUsers />}
          {activeTab === "ricette"      && <AdminRecipesManager />}
          {activeTab === "audit_ingredients" && <AdminRecipeIngredientAudit />}
          {activeTab === "dietary_tags_bulk" && <AdminDietaryTagsBulk />}
          {activeTab === "genera"       && <AdminRecipeGenerator />}
          {activeTab === "base_free"    && <AdminBaseFreeRecipes />}
          {activeTab === "emails"       && <AdminEmailTemplates />}
          {activeTab === "notifiche"    && <AdminNotifications />}
          {activeTab === "permessi"     && <AdminPermissions />}
          {activeTab === "webhooks"     && <AdminWebhooks />}
          {activeTab === "ebook"          && <AdminEbookFollowup />}
          {activeTab === "premium_intel"  && <AdminPremiumIntelligence />}
          {activeTab === "user_products"  && <AdminUserProducts />}
          {activeTab === "gp_products"    && <AdminGostoPuroProducts />}
          {activeTab === "impostazioni" && <AdminSettings />}
        </main>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}