import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const emptyForm = {
  nome: "", slug: "", descricao: "", image_url: "", webhook_url: "",
  hotmart_product_id: "", occasioni: [], is_active: true, sort_order: 0, is_free: false,
};

export default function AdminGostoPuroProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.GostoPuroProduct.list("sort_order", 200);
    setProducts(data);
    setLoading(false);
  };

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ ...emptyForm, ...p }); setEditId(p.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.slug.trim()) return toast.error("Nome e slug obbligatori");
    setSaving(true);
    const data = { ...form, sort_order: Number(form.sort_order) || 0 };
    if (editId) {
      await base44.entities.GostoPuroProduct.update(editId, data);
      setProducts((prev) => prev.map((p) => p.id === editId ? { ...p, ...data } : p));
      toast.success("Prodotto aggiornato!");
    } else {
      const created = await base44.entities.GostoPuroProduct.create(data);
      setProducts((prev) => [...prev, created]);
      toast.success("Prodotto creato!");
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questo prodotto?")) return;
    setDeleting(id);
    await base44.entities.GostoPuroProduct.delete(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
    toast.success("Eliminato");
  };

  const toggleActive = async (p) => {
    await base44.entities.GostoPuroProduct.update(p.id, { is_active: !p.is_active });
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew} className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuovo Prodotto
        </button>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <div className="flex items-start gap-3">
              {p.image_url && <img src={p.image_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-800">{p.nome}</p>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{p.slug}</span>
                  {p.is_free && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-semibold">Gratuito</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold ${p.is_active ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                    {p.is_active ? "Attivo" : "Inattivo"}
                  </span>
                </div>
                {p.descricao && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{p.descricao}</p>}
                <div className="mt-1">
                  <p className="text-[10px] text-gray-400 font-semibold">Webhook Hotmart:</p>
                  <p className="text-[10px] text-purple-600 font-mono break-all bg-purple-50 rounded px-1.5 py-0.5 mt-0.5 select-all">
                    {`${window.location.origin}/api/hotmartProductWebhook`}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Hotmart Product ID configurato: <span className="font-mono text-gray-600">{p.hotmart_product_id || '—'}</span></p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => toggleActive(p)} className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${p.is_active ? "bg-blue-50 text-blue-500" : "bg-gray-100 text-gray-400"}`}>
                  {p.is_active ? "✓" : "○"}
                </button>
                <button onClick={() => openEdit(p)} className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Pencil className="w-3.5 h-3.5 text-blue-500" />
                </button>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                  {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica Prodotto" : "Nuovo Prodotto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="rounded-xl" />
            <Input placeholder="Slug * (es: frigo_aria)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="rounded-xl" />
            <textarea placeholder="Descrizione" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm resize-none h-16 focus:outline-none" />
            <Input placeholder="URL Immagine" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="rounded-xl" />
            <Input placeholder="Webhook URL" value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} className="rounded-xl" />
            <Input placeholder="Hotmart Product ID" value={form.hotmart_product_id} onChange={(e) => setForm({ ...form, hotmart_product_id: e.target.value })} className="rounded-xl" />
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Occasioni (una per riga)</label>
              <textarea
                placeholder="Natale&#10;Estate&#10;Capodanno"
                value={(form.occasioni || []).join("\n")}
                onChange={(e) => setForm({ ...form, occasioni: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                className="w-full mt-1 rounded-xl border border-gray-100 px-3 py-2 text-sm resize-none h-20 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Ordine</label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                  Attivo
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} className="rounded" />
                  Gratuito
                </label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {editId ? "Aggiorna" : "Crea"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}