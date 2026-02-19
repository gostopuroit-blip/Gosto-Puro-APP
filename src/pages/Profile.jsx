import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Check, Loader2, ChevronDown, ChevronUp, ShieldCheck, Crown, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PremiumBadge } from "@/components/PremiumGate";

const alimentariRestrictions = [
  "Celiachia",
  "Senza Glutine",
  "Senza Lattosio",
  "Allergia alle Proteine del Latte",
  "Allergia all'Uovo",
  "Allergia alle Arachidi",
  "Allergia alla Frutta a Guscio",
  "Allergia alla Soia",
  "Vegetariano",
  "Vegano",
  "Halal",
  "Kosher",
];

const healthConditions = [
  "Diabete Tipo 1",
  "Diabete Tipo 2",
  "Pre-diabete",
  "Ipoglicemia",
  "Sindrome dell'Intestino Irritabile",
  "Morbo di Crohn",
  "Colite Ulcerosa",
  "Steatosi Epatica",
  "Epatite",
  "Cirrosi",
  "Colesterolo Alto",
  "Trigliceridi Alti",
  "Ipertensione",
  "Gastrite",
  "Reflusso Gastroesofageo",
  "Ulcera Gastrica",
  "Dispepsia",
  "Disturbo da Alimentazione Incontrollata",
  "Anoressia / Bulimia",
  "Neonati (sotto 1 anno)",
  "Anziani",
  "Gravidanza",
];

function TagToggle({ label, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(label)}
      className={`px-3.5 py-2 rounded-full text-xs font-semibold border-2 transition-all active:scale-95 ${
        selected
          ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-md shadow-[#2D6A4F]/20"
          : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
      }`}
    >
      {selected && <span className="mr-1">✓</span>}
      {label}
    </button>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedAlimentari, setSelectedAlimentari] = useState([]);
  const [selectedHealth, setSelectedHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAllHealth, setShowAllHealth] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const u = await base44.auth.me().catch(() => null);
    if (u) {
      setUser(u);
      setName(u.full_name || "");
      setAge(u.age || "");
      setPhotoUrl(u.photo_url || "");
      setSelectedAlimentari(u.dietary_restrictions || []);
      setSelectedHealth(u.health_conditions || []);
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

  const toggleHealth = (label) => {
    setSelectedHealth((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      age: age ? parseInt(age) : undefined,
      photo_url: photoUrl,
      dietary_restrictions: selectedAlimentari,
      health_conditions: selectedHealth,
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

      {/* Dietary Restrictions */}
      <div className="px-5 mt-6">
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-900">Restrizioni Alimentari</h2>
          <p className="text-xs text-gray-400 mt-0.5">Seleziona le tue intolleranze o preferenze</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {alimentariRestrictions.map((label) => (
            <TagToggle
              key={label}
              label={label}
              selected={selectedAlimentari.includes(label)}
              onToggle={toggleAlimentari}
            />
          ))}
        </div>
      </div>

      {/* Health Conditions */}
      <div className="px-5 mt-6">
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-900">Condizioni di Salute</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Seleziona le tue condizioni per ricevere ricette adatte e sicure
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleHealth.map((label) => (
            <TagToggle
              key={label}
              label={label}
              selected={selectedHealth.includes(label)}
              onToggle={toggleHealth}
            />
          ))}
        </div>
        <button
          onClick={() => setShowAllHealth(!showAllHealth)}
          className="mt-3 flex items-center gap-1.5 text-[#2D6A4F] text-xs font-semibold"
        >
          {showAllHealth ? (
            <>Mostra meno <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Vedi tutte ({healthConditions.length}) <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
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