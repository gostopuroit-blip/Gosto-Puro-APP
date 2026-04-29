import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Crown, ShieldCheck, Shield, Ban, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => { load(); }, []);

  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('adminGetUsersV2');
      const raw = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError("Errore nel caricamento degli utenti.");
    } finally {
      setLoading(false);
    }
  };

  const update = async (userId, data, label) => {
    const key = userId + Object.keys(data)[0];
    setUpdating(key);
    try {
      const res = await base44.functions.invoke('adminUpdateUser', { userId, data });
      if (res.data?.error) throw new Error(res.data.error);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data } : u));
      toast.success(label);
    } catch (e) {
      toast.error("Errore: " + (e.message || "Operazione fallita"));
    } finally {
      setUpdating(null);
    }
  };

  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async (dryRun = false) => {
    setCleaning(true);
    const res = await base44.functions.invoke('cleanupFreeUserRecipes', { dryRun });
    const d = res.data;
    if (dryRun) {
      toast.info(`Simulazione: ${d.usersAffected} utenti, ${d.totalToDelete} ricette da eliminare`);
      if (d.report?.length > 0) {
        d.report.forEach(r => console.log(`${r.email}: ${r.had} → ${r.kept} (elimina ${r.deleted})`));
      }
    } else {
      toast.success(`Pulizia completata: ${d.usersAffected} utenti, ${d.totalDeleted} ricette eliminate`);
    }
    setCleaning(false);
  };

  const filtered = users.filter((u) =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>;
  if (error) return <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      {/* Cleanup banner */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-sm font-semibold text-orange-800">🧹 Pulizia ricette eccedenti (utenti Free)</p>
        <p className="text-xs text-orange-600">Elimina le ricette salvate degli utenti free che superano il limite di 4. Prima simula, poi esegui.</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => handleCleanup(true)}
            disabled={cleaning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-orange-200 text-orange-700 active:scale-95 transition-all"
          >
            {cleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : "🔍"} Simula
          </button>
          <button
            onClick={() => handleCleanup(false)}
            disabled={cleaning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white active:scale-95 transition-all"
          >
            {cleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Esegui pulizia
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User list */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const isAdmin = u.role === "admin";
          const isExpert = u.role === "expert";
          const isPremium = u.plan === "premium";
          const isBlocked = u.status === "blocked";
          return (
            <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0F7F4] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <span className="text-base">👤</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{u.full_name || "—"}</p>
                  <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {isAdmin && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">👑 Admin</span>}
                    {isExpert && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Expert</span>}
                    {isPremium
                      ? <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">✨ Premium</span>
                      : <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Free</span>
                    }
                    {isBlocked && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">🚫 Bloccato</span>}
                  </div>
                </div>
              </div>

              {/* Prodotti Acquistati */}
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-500 mb-2">PRODOTTI ACQUISTATI</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(u.purchased_products || []).length > 0 ? (
                    (u.purchased_products || []).map((slug) => (
                      <div key={slug} className="flex items-center gap-1 bg-green-50 rounded-lg px-2 py-1 border border-green-100">
                        <span className="text-[11px] font-semibold text-green-700">{slug}</span>
                        <button
                          onClick={() => {
                            const updated = u.purchased_products.filter(s => s !== slug);
                            update(u.id, { purchased_products: updated }, "Prodotto rimosso");
                          }}
                          className="text-[11px] text-green-600 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-gray-400">Nessun prodotto</span>
                  )}
                </div>
                <ProductDropdown
                  onSelect={(slug) => {
                    const updated = [...(u.purchased_products || []), slug];
                    update(u.id, { purchased_products: updated }, "Prodotto aggiunto");
                  }}
                  current={u.purchased_products || []}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
                <ActionBtn
                  loading={updating === u.id + "plan"}
                  onClick={() => update(u.id, { plan: isPremium ? "free" : "premium" }, isPremium ? "Piano impostato su Free" : "Piano impostato su Premium")}
                  icon={isPremium ? "↓" : <Crown className="w-3 h-3" />}
                  label={isPremium ? "→ Free" : "→ Premium"}
                  color={isPremium ? "gray" : "amber"}
                />
                <ActionBtn
                   loading={updating === u.id + "role"}
                   onClick={() => update(u.id, { role: isAdmin ? "user" : "admin" }, isAdmin ? "Rimosso da Admin" : "Promosso Admin")}
                   icon={isAdmin ? <Shield className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                   label={isAdmin ? "Rimuovi Admin" : "Rendi Admin"}
                   color={isAdmin ? "red" : "purple"}
                 />
                <ActionBtn
                   loading={updating === u.id + "expert"}
                   onClick={() => update(u.id, { role: isExpert ? "user" : "expert" }, isExpert ? "Expert rimosso" : "Promosso Expert")}
                   icon="✅"
                   label={isExpert ? "Rimuovi Expert" : "Rendi Expert"}
                   color={isExpert ? "gray" : "green"}
                 />
                <ActionBtn
                  loading={updating === u.id + "status"}
                  onClick={() => update(u.id, { status: isBlocked ? "active" : "blocked" }, isBlocked ? "Utente sbloccato" : "Utente bloccato")}
                  icon={isBlocked ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                  label={isBlocked ? "Sblocca" : "Blocca"}
                  color={isBlocked ? "green" : "red"}
                />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Nessun utente trovato</p>}
      </div>
    </div>
  );
}

function ProductDropdown({ onSelect, current }) {
  const products = [
    "diabetici",
    "fitness_pratiche",
    "ricette_sane_35",
    "ricette_veloci_pratiche",
    "cene_friggitrice",
    "ricette_congelare",
    "senza_zucchero",
    "ricette_detox",
    "low_carb",
    "504_ricette_collezione",
    "cucina_senza_tempo"
  ];
  
  const available = products.filter(p => !current.includes(p));
  
  if (available.length === 0) {
    return <span className="text-[11px] text-gray-400">Tutti i prodotti aggiunti</span>;
  }
  
  return (
    <select
      onChange={(e) => {
        if (e.target.value) {
          onSelect(e.target.value);
          e.target.value = "";
        }
      }}
      className="text-[11px] px-2.5 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 font-semibold"
    >
      <option value="">+ Aggiungi prodotto</option>
      {available.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}

function ActionBtn({ loading, onClick, icon, label, color }) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    red: "bg-red-50 text-red-600 border-red-100",
    green: "bg-green-50 text-green-700 border-green-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 ${colors[color]}`}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}