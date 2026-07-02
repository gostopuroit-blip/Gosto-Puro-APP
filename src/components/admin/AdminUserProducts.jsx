import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Package, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AdminUserProducts() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [usersRes, productsRes] = await Promise.all([
      base44.functions.invoke("adminGetUsersV2", {}),
      base44.entities.GostoPuroProduct.filter({ is_active: true }, "sort_order"),
    ]);
    setUsers(usersRes.data?.users || []);
    setProducts(productsRes);
    setLoading(false);
  };

  const openUser = (user) => {
    setSelectedUser(user);
    setSelectedSlugs(user.purchased_products || []);
  };

  const toggleSlug = (slug) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.functions.invoke("adminUpdateUser", {
      userId: selectedUser.id,
      updates: { purchased_products: selectedSlugs },
    });
    setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, purchased_products: selectedSlugs } : u));
    toast.success("Prodotti aggiornati!");
    setSaving(false);
    setSelectedUser(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{users.length} utenti totali · clicca su un utente per gestire i suoi prodotti</p>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-purple-600">
              {(u.display_name || u.email || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{u.display_name || "—"}</p>
              <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg font-semibold">{u.role || "user"}</span>
              <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1">
                <Package className="w-3 h-3" />{(u.purchased_products || []).length}
              </span>
              <button onClick={() => openUser(u)} className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                Gestisci
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-sm mx-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Prodotti — {selectedUser?.display_name || selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {products.map((p) => {
              const active = selectedSlugs.includes(p.slug);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleSlug(p.slug)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${active ? "border-purple-400 bg-purple-50" : "border-gray-100 bg-white"}`}
                >
                  {p.image_url && <img src={p.image_url} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{p.nome}</p>
                    <p className="text-[10px] text-gray-400">{p.slug}{p.is_free ? " · Gratuito" : ""}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-purple-600" : "border-2 border-gray-200"}`}>
                    {active && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Salva
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}