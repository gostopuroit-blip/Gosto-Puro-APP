import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminExperts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await base44.entities.User.list("-created_date", 500).catch(() => []);
    setUsers(data);
    setLoading(false);
  };

  const handleMakeExpert = async (user) => {
    setUpdating(user.id);
    try {
      await base44.entities.User.update(user.id, { is_expert: true, role: "premium" });
      setUsers(users.map((u) => u.id === user.id ? { ...u, is_expert: true, role: "premium" } : u));
      toast.success(`${user.display_name || user.email} è ora un Expert!`);
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveExpert = async (user) => {
    setUpdating(user.id);
    try {
      await base44.entities.User.update(user.id, { is_expert: false, role: "user" });
      setUsers(users.map((u) => u.id === user.id ? { ...u, is_expert: false, role: "user" } : u));
      toast.success(`Expert rimosso per ${user.display_name || user.email}`);
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  const expertCount = users.filter((u) => u.is_expert).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-semibold">Expert Attivi</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{expertCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-semibold">Totale Utenti</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{users.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome o email..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none"
        />
      </div>

      {/* User list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">Nessun utente trovato</p>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filtered.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {user.photo_url ? (
                    <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-500">
                      {(user.display_name || user.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {user.display_name || user.email?.split("@")[0]}
                      </p>
                      {user.is_expert && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">✅ Expert</span>
                      )}
                      {user.role === "admin" && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">👑 Admin</span>
                      )}
                      {(user.plan === "premium" || user.role === "premium") && !user.is_expert && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">⭐ Premium</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <p className="text-[10px] text-gray-400">role: {user.role || "user"} · plan: {user.plan || "free"}</p>
                  </div>
                </div>
                {user.role !== "admin" && (
                  updating === user.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
                  ) : user.is_expert ? (
                    <button
                      onClick={() => handleRemoveExpert(user)}
                      className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold transition flex-shrink-0"
                    >
                      Rimuovi Expert
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMakeExpert(user)}
                      className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-semibold transition flex-shrink-0 flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Rendi Expert
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}