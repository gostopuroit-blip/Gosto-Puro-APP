import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Search, Loader2, X, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const categories = ["Colazione", "Pranzo", "Cena", "Dolce", "Snack", "Bevanda"];
const difficulties = ["Facile", "Media", "Difficile"];
const visibilities = ["all", "free", "premium"];

const emptyForm = {
  title: "", description: "", image_url: "", category: "Pranzo",
  prep_time: 30, servings: 4, difficulty: "Facile", calories: null,
  ingredients: [{ name: "", quantity: "", category: "" }],
  instructions: [""], occasions: [], lifestyle: [],
  visibility: "all", numero_salvate: 0, numero_preparate: 0,
};

export default function AdminRecipesManager() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tutti");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.Recipe.list("-created_date", 200);
    setRecipes(data);
    setLoading(false);
  };

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (r) => {
    setForm({
      ...emptyForm, ...r,
      ingredients: r.ingredients?.length ? r.ingredients : [{ name: "", quantity: "", category: "" }],
      instructions: r.instructions?.length ? r.instructions : [""],
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Inserisci un titolo");
    setSaving(true);
    const cleanIngredients = form.ingredients.filter((i) => i.name.trim());
    const cleanInstructions = form.instructions.filter((s) => s.trim());
    const data = { ...form, ingredients: cleanIngredients, instructions: cleanInstructions, prep_time: Number(form.prep_time) || 30 };
    if (editId) {
      await base44.entities.Recipe.update(editId, data);
      setRecipes((prev) => prev.map((r) => r.id === editId ? { ...r, ...data } : r));
      toast.success("Ricetta aggiornata!");
    } else {
      const created = await base44.entities.Recipe.create(data);
      setRecipes((prev) => [created, ...prev]);
      toast.success("Ricetta creata!");
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa ricetta?")) return;
    setDeleting(id);
    await base44.entities.Recipe.delete(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setDeleting(null);
    toast.success("Ricetta eliminata");
  };

  const filtered = recipes.filter((r) => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "Tutti" || r.category === catFilter;
    return matchSearch && matchCat;
  });

  const setIng = (i, field, val) => {
    const ings = [...form.ingredients];
    ings[i] = { ...ings[i], [field]: val };
    setForm((f) => ({ ...f, ingredients: ings }));
  };

  const setStep = (i, val) => {
    const steps = [...form.instructions];
    steps[i] = val;
    setForm((f) => ({ ...f, instructions: steps }));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Search + New */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 text-sm bg-white focus:outline-none" placeholder="Cerca ricetta..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openNew} className="flex items-center gap-1 bg-[#2D6A4F] text-white px-4 py-2.5 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuova
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {["Tutti", ...categories].map((c) => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === c ? "bg-[#2D6A4F] text-white" : "bg-white border border-gray-100 text-gray-500"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {r.image_url ? <img src={r.image_url} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-xl">🍽️</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{r.title}</p>
              <p className="text-[10px] text-gray-400">{r.category} · {r.prep_time}min</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => openEdit(r)} className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Pencil className="w-3.5 h-3.5 text-blue-500" />
              </button>
              <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                {deleting === r.id ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Nessuna ricetta trovata</p>}
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica Ricetta" : "Nuova Ricetta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Image */}
            <div className="relative w-full h-32 bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100">
              {form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" /> : <span className="text-4xl">🍽️</span>}
              <label className="absolute bottom-2 right-2 bg-[#2D6A4F] text-white p-2 rounded-xl cursor-pointer shadow">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <Input placeholder="Titolo *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" />
            <textarea placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm resize-none h-20 focus:outline-none" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 rounded-xl border border-gray-100 px-3 py-2 text-sm bg-white focus:outline-none">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Difficoltà</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full mt-1 rounded-xl border border-gray-100 px-3 py-2 text-sm bg-white focus:outline-none">
                  {difficulties.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Tempo (min)</label>
                <Input type="number" value={form.prep_time} onChange={(e) => setForm({ ...form, prep_time: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Porzioni</label>
                <Input type="number" value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase">kcal</label>
                <Input type="number" value={form.calories || ""} onChange={(e) => setForm({ ...form, calories: e.target.value })} className="rounded-xl mt-1" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Visibilità</label>
              <div className="flex gap-2 mt-1">
                {visibilities.map((v) => (
                  <button key={v} onClick={() => setForm({ ...form, visibility: v })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.visibility === v ? "bg-[#2D6A4F] text-white border-[#2D6A4F]" : "border-gray-100 text-gray-500"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Ingredienti</label>
                <button onClick={() => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { name: "", quantity: "", category: "" }] }))} className="text-[10px] text-[#2D6A4F] font-bold">+ Aggiungi</button>
              </div>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <Input placeholder="Nome" value={ing.name} onChange={(e) => setIng(i, "name", e.target.value)} className="rounded-lg flex-1" />
                  <Input placeholder="Qtà" value={ing.quantity} onChange={(e) => setIng(i, "quantity", e.target.value)} className="rounded-lg w-20" />
                  <button onClick={() => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) }))} className="text-gray-300 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Procedimento</label>
                <button onClick={() => setForm((f) => ({ ...f, instructions: [...f.instructions, ""] }))} className="text-[10px] text-[#2D6A4F] font-bold">+ Passo</button>
              </div>
              {form.instructions.map((step, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <span className="w-6 h-9 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">{i + 1}</span>
                  <textarea
                    placeholder={`Passo ${i + 1}`}
                    value={step}
                    onChange={(e) => setStep(i, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-100 px-3 py-2 text-sm resize-none h-16 focus:outline-none"
                  />
                  <button onClick={() => setForm((f) => ({ ...f, instructions: f.instructions.filter((_, j) => j !== i) }))} className="text-gray-300 hover:text-red-400 self-start mt-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl bg-[#2D6A4F] hover:bg-[#235c43] font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {editId ? "Aggiorna ricetta" : "Crea ricetta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}