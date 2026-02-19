import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Check, Loader2, ShieldCheck, Crown, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PremiumBadge } from "@/components/PremiumGate";



export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const u = await base44.auth.me().catch(() => null);
    if (u) {
      setUser(u);
      setName(u.full_name || "");
      setAge(u.age != null ? String(u.age) : "");
      setPhotoUrl(u.photo_url || "");
      setSelectedAlimentari(u.dietary_restrictions || []);
      setSelectedHealth(u.health_conditions || []);
      // Restore theme preference saved on user
      if (u.dark_mode) {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const toggleAlimentari = (label) => {
    setSelectedAlimentari((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    // Save only the dark_mode preference, not touching other fields
    base44.auth.updateMe({ dark_mode: next });
  };

  const toggleHealth = (label) => {
    setSelectedHealth((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      age: age ? parseInt(age) : null,
      photo_url: photoUrl,
      dietary_restrictions: selectedAlimentari,
      health_conditions: selectedHealth,
      dark_mode: darkMode,
    });
    setSaving(false);
    toast.success("Profilo aggiornato! ✅");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  const visibleHealth = showAllHealth ? healthConditions : healthConditions.slice(0, 8);

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 bg-gradient-to-b from-[#F0F7F4] to-[#FAFAF8]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Il mio Profilo</h1>
            <p className="text-sm text-gray-400 mt-0.5">Personalizza la tua esperienza</p>
          </div>
          {user && <PremiumBadge user={user} />}
        </div>
      </div>

      {/* Avatar + Name */}
      <div className="px-5">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <div className="flex items-center gap-4">
            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#F0F7F4] flex items-center justify-center">
                {photoUrl ? (
                  <img src={photoUrl} alt="Foto profilo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>
              <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#2D6A4F] rounded-full flex items-center justify-center cursor-pointer shadow-md">
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            {/* Name + Age */}
            <div className="flex-1 space-y-2">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Nome</label>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{name || "—"}</p>
                <p className="text-[10px] text-gray-300">{user?.email}</p>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Età</label>
                <Input
                  type="number"
                  placeholder="Es. 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 h-8 text-sm rounded-xl border-gray-100 w-24"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="px-5 mt-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
              {darkMode ? <Moon className="w-5 h-5 text-gray-700" /> : <Sun className="w-5 h-5 text-yellow-500" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Modalità Scura</p>
              <p className="text-xs text-gray-400">Cambia l'aspetto dell'app</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${darkMode ? "bg-[#2D6A4F]" : "bg-gray-200"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>



      {/* Save Button */}
      <div className="px-5 mt-8">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-6 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] font-bold shadow-lg shadow-[#2D6A4F]/20"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
          Salva profilo
        </Button>
      </div>

      {/* Abbonamento */}
      <div className="px-5 mt-4">
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">
              {user?.plan === "premium" || user?.role === "admin" ? "Piano Premium attivo ✨" : "Piano Free"}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {user?.plan === "premium" || user?.role === "admin"
                ? "Hai accesso completo a tutte le funzionalità"
                : "Sblocca Planner, Occasioni Speciali e molto altro"}
            </p>
          </div>
          {(!user?.plan || user?.plan === "free") && user?.role !== "admin" && (
            <button className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Admin Panel Button */}
      {user?.role === "admin" && (
        <div className="px-5 mt-4">
          <Link to={createPageUrl("Admin")}>
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-purple-200 active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Pannello Admin</p>
                <p className="text-[10px] text-white/70">Gestisci utenti, ricette e impostazioni</p>
              </div>
              <span className="text-white/60 text-lg">→</span>
            </div>
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="px-5 mt-4">
        <button
          onClick={() => base44.auth.logout()}
          className="w-full py-3 rounded-2xl border border-gray-100 text-sm font-semibold text-gray-400 hover:text-red-500 hover:border-red-100 transition-colors"
        >
          Esci dall'account
        </button>
      </div>
    </div>
  );
}