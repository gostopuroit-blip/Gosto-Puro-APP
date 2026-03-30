import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Users, Lock, Globe, Loader2, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CATEGORIES = ["food", "recipe", "health", "lifestyle", "fitness", "general"];
const CAT_LABELS = { food: "🍽 Cibo", recipe: "📖 Ricette", health: "💚 Salute", lifestyle: "✨ Stile di vita", fitness: "💪 Fitness", general: "💬 Generale" };

function CreateGroupModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", category: "food", privacy: "public" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Inserisci un nome");
    setSaving(true);
    const g = await base44.entities.Group.create({
      ...form,
      owner_email: currentUser.email,
      admins: [currentUser.email],
      members: [currentUser.email],
      members_count: 1,
      status: "active",
    });
    toast.success("Gruppo creato!");
    onCreated(g);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Crea gruppo</h3>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nome del gruppo"
          className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Descrizione (opzionale)"
          className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none resize-none h-20"
        />
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setForm({ ...form, category: c })}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${form.category === c ? "border-[#2D6A4F] bg-[#2D6A4F]/10 text-[#2D6A4F]" : "border-gray-100 dark:border-[#2A2A2A] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#111]"}`}>
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["public", "private"].map((p) => (
            <button key={p} onClick={() => setForm({ ...form, privacy: p })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.privacy === p ? "border-[#2D6A4F] bg-[#2D6A4F]/10 text-[#2D6A4F]" : "border-gray-100 dark:border-[#2A2A2A] text-gray-500 bg-gray-50 dark:bg-[#111]"}`}>
              {p === "public" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {p === "public" ? "Pubblico" : "Privato"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500">Annulla</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crea"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group, currentUser, onUpdate }) {
  const isMember = group.members?.includes(currentUser?.email);
  const [joining, setJoining] = useState(false);

  const toggleJoin = async () => {
    if (!currentUser) return toast.error("Fai login prima");
    setJoining(true);
    if (isMember) {
      const newMembers = group.members.filter((e) => e !== currentUser.email);
      await base44.entities.Group.update(group.id, { members: newMembers, members_count: newMembers.length });
      onUpdate({ ...group, members: newMembers, members_count: newMembers.length });
      toast.success("Hai lasciato il gruppo");
    } else {
      const newMembers = [...(group.members || []), currentUser.email];
      await base44.entities.Group.update(group.id, { members: newMembers, members_count: newMembers.length });
      onUpdate({ ...group, members: newMembers, members_count: newMembers.length });
      toast.success("Hai unito al gruppo!");
    }
    setJoining(false);
  };

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden">
      {group.cover_image ? (
        <img src={group.cover_image} alt="" className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center">
          <Users className="w-8 h-8 text-white/50" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{group.name}</p>
              {group.privacy === "private" && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{CAT_LABELS[group.category] || group.category} · {group.members_count || 0} membri</p>
            {group.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{group.description}</p>}
          </div>
          <button
            onClick={toggleJoin}
            disabled={joining}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${isMember ? "bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 dark:text-gray-300" : "bg-[#2D6A4F] text-white"}`}
          >
            {joining ? "..." : isMember ? "Uscire" : "Unirsi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | mine
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setCurrentUser(u);
      const data = await base44.entities.Group.filter({ status: "active" }, "-members_count", 50);
      setGroups(data);
      setLoading(false);
    };
    init();
  }, []);

  const handleGroupUpdate = (updated) => {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const filtered = groups.filter((g) => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || (tab === "mine" && g.members?.includes(currentUser?.email));
    return matchSearch && matchTab;
  });

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2D6A4F]" />
              <h1 className="font-bold text-gray-900 dark:text-white text-lg">Gruppi</h1>
            </div>
          </div>
          {currentUser && (
            <button onClick={() => setShowCreate(true)} className="bg-[#2D6A4F] text-white text-sm font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Crea
            </button>
          )}
        </div>
        {/* Search + Tabs */}
        <div className="max-w-lg mx-auto px-4 pb-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca gruppi..."
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white outline-none"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-gray-400"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex gap-3">
            {["all", "mine"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-sm font-semibold pb-0.5 border-b-2 transition-all ${tab === t ? "border-[#2D6A4F] text-[#2D6A4F]" : "border-transparent text-gray-400"}`}>
                {t === "all" ? "Tutti" : "I miei"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-400 text-sm">{tab === "mine" ? "Non sei in nessun gruppo" : "Nessun gruppo trovato"}</p>
          </div>
        ) : (
          filtered.map((g) => (
            <GroupCard key={g.id} group={g} currentUser={currentUser} onUpdate={handleGroupUpdate} />
          ))
        )}
      </div>

      {showCreate && currentUser && (
        <CreateGroupModal
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onCreated={(g) => setGroups((prev) => [g, ...prev])}
        />
      )}
    </div>
  );
}