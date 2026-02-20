import { useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminRecipesManager from "@/components/admin/AdminRecipesManager";
import AdminRecipeGenerator from "@/components/admin/AdminRecipeGenerator";
import AdminPermissions from "@/components/admin/AdminPermissions";
import AdminWebhooks from "@/components/admin/AdminWebhooks";
import AdminSettings from "@/components/admin/AdminSettings";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "utenti", label: "Utenti", icon: "👥" },
  { key: "ricette", label: "Ricette", icon: "🍽️" },
  { key: "genera", label: "Genera AI", icon: "✨" },
  { key: "permessi", label: "Permessi", icon: "🔐" },
  { key: "webhooks", label: "Webhooks", icon: "📡" },
  { key: "impostazioni", label: "Impostazioni", icon: "⚙️" },
];

function AdminContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 bg-gradient-to-b from-purple-50 to-[#FAFAF8]">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("Profile")} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pannello Admin</h1>
            <p className="text-xs text-gray-400">👑 Accesso riservato</p>
          </div>
        </div>

        {/* Tab nav - horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === t.key
                  ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                  : "bg-white text-gray-500 border border-gray-100"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 mt-4">
        {activeTab === "dashboard" && <AdminDashboard onNavigate={setActiveTab} />}
        {activeTab === "utenti" && <AdminUsers />}
        {activeTab === "ricette" && <AdminRecipesManager />}
        {activeTab === "genera" && <AdminRecipeGenerator />}
        {activeTab === "permessi" && <AdminPermissions />}
        {activeTab === "webhooks" && <AdminWebhooks />}
        {activeTab === "impostazioni" && <AdminSettings />}
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