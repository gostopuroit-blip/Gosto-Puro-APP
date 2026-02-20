import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Camera, Check, Loader2, ShieldCheck, Crown, Moon, Sun, Trash2 } from "lucide-react";
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: name,
        age: age ? parseInt(age) : null,
        photo_url: photoUrl,
        dark_mode: darkMode,
      });
      toast.success("Profilo aggiornato! ✅");
    } catch (error) {
      toast.error("Errore nel salvataggio del profilo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }



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
                <label className="text-[13px] text-gray-400 font-semibold uppercase tracking-wider">Nome</label>
                <Input
                  type="text"
                  placeholder="Es. Brandom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-8 text-sm rounded-xl border-gray-100"
                />
                <p className="text-[13px] text-gray-300">{user?.email}</p>
              </div>
              <div>
                <label className="text-[13px] text-gray-400 font-semibold uppercase tracking-wider">Età</label>
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
            <button className="bg-amber-500 text-white text-[13px] font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
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
                <p className="text-[13px] text-white/80">Gestisci ricette, utenti e generazioni</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Delete Account */}
      <div className="px-5 mt-4 mb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-red-400 border border-red-100 rounded-2xl active:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
              Elimina account
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare l'account?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione è irreversibile. Tutti i tuoi dati, ricette salvate e piani verranno eliminati definitivamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 rounded-xl"
                onClick={() => {
                  toast.error("Per eliminare l'account contatta il supporto.");
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}