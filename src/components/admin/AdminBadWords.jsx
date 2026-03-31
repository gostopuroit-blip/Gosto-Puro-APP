import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, AlertTriangle, Ban, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { invalidateBadWordsCache } from "@/lib/badWordsFilter";

const CATEGORIES = ["offensive", "hate_speech", "sexual", "violence", "other"];
const CATEGORY_LABELS = {
  offensive: "Offensivo",
  hate_speech: "Incitamento all'odio",
  sexual: "Sessuale",
  violence: "Violenza",
  other: "Altro",
};

export default function AdminBadWords() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Form
  const [newWord, setNewWord] = useState("");
  const [newSeverity, setNewSeverity] = useState("block");
  const [newCategory, setNewCategory] = useState("offensive");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.BadWord.list("-created_date", 500).catch(() => []);
    setWords(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newWord.trim()) return toast.error("Inserisci una parola");
    setAdding(true);
    try {
      const created = await base44.entities.BadWord.create({
        word: newWord.trim().toLowerCase(),
        severity: newSeverity,
        category: newCategory,
      });
      setWords([created, ...words]);
      setNewWord("");
      invalidateBadWordsCache();
      toast.success("Parola aggiunta!");
    } catch (e) {
      toast.error("Errore nell'aggiunta");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa parola?")) return;
    await base44.entities.BadWord.delete(id).catch(() => {});
    setWords(words.filter((w) => w.id !== id));
    invalidateBadWordsCache();
    toast.success("Parola rimossa");
  };

  const handleToggleSeverity = async (word) => {
    const newSev = word.severity === "block" ? "warning" : "block";
    await base44.entities.BadWord.update(word.id, { severity: newSev }).catch(() => {});
    setWords(words.map((w) => w.id === word.id ? { ...w, severity: newSev } : w));
    invalidateBadWordsCache();
  };

  const filtered = words.filter((w) => {
    const matchSearch = !search || w.word?.toLowerCase().includes(search.toLowerCase());
    const matchSev = filterSeverity === "all" || w.severity === filterSeverity;
    const matchCat = filterCategory === "all" || w.category === filterCategory;
    return matchSearch && matchSev && matchCat;
  });

  const blockCount = words.filter((w) => w.severity === "block").length;
  const warnCount = words.filter((w) => w.severity === "warning").length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 text-center">
          <p className="text-2xl font-bold text-gray-900">{words.length}</p>
          <p className="text-xs text-gray-400 mt-1">Totale parole</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{blockCount}</p>
          <p className="text-xs text-red-400 mt-1">Bloccanti</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{warnCount}</p>
          <p className="text-xs text-amber-400 mt-1">Avvisi</p>
        </div>
      </div>

      {/* Add new word */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
        <p className="text-sm font-bold text-gray-800">➕ Aggiungi parola vietata</p>
        <input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Inserisci parola o frase..."
          className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">Severità</label>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
              className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50 outline-none"
            >
              <option value="block">🚫 Blocca</option>
              <option value="warning">⚠️ Avviso</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">Categoria</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full text-xs px-2 py-2 rounded-xl border border-gray-100 bg-gray-50 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !newWord.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Aggiungi
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white outline-none"
          />
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-xs px-2 py-2 rounded-xl border border-gray-200 bg-white outline-none"
        >
          <option value="all">Tutte</option>
          <option value="block">Solo blocco</option>
          <option value="warning">Solo avviso</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-xs px-2 py-2 rounded-xl border border-gray-200 bg-white outline-none"
        >
          <option value="all">Tutte cat.</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {/* Word list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-10">Nessuna parola trovata</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{w.word}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{CATEGORY_LABELS[w.category] || w.category}</p>
                </div>
                <button
                  onClick={() => handleToggleSeverity(w)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    w.severity === "block"
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                  }`}
                  title="Clicca per cambiare severità"
                >
                  {w.severity === "block"
                    ? <><Ban className="w-3 h-3" /> Blocca</>
                    : <><AlertTriangle className="w-3 h-3" /> Avviso</>
                  }
                </button>
                <button
                  onClick={() => handleDelete(w.id)}
                  className="text-gray-300 hover:text-red-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}