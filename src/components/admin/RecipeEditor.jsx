import { useState } from "react";
import { X, Plus } from "lucide-react";

const CATEGORIES = ["Colazione", "Pranzo", "Cena", "Dolce", "Snack", "Bevanda"];
const DIFFICULTIES = ["Facile", "Media", "Difficile"];
const DIETARY_TAGS = [
  "Senza glutine", "Senza lattosio", "Senza zucchero", "Vegano", "Vegetariano",
  "Low carb", "Alto contenuto proteico", "Diabetico", "Detox", "Fit", "Senza uova", "Senza frutti di mare"
];
const INGREDIENT_CATEGORIES = ["Ortofrutta", "Carne e pesce", "Latticini", "Dispensa", "Surgelati", "Altro"];

export default function RecipeEditor({ recipe, onSave, onCancel }) {
  const [form, setForm] = useState({ ...recipe });

  const handleSave = () => {
    onSave(form);
  };

  const toggleDietaryTag = (tag) => {
    setForm((f) => ({
      ...f,
      dietary_tags: f.dietary_tags?.includes(tag)
        ? f.dietary_tags.filter((t) => t !== tag)
        : [...(f.dietary_tags || []), tag]
    }));
  };

  const addIngredient = () => {
    setForm((f) => ({
      ...f,
      ingredients: [...(f.ingredients || []), { name: "", quantity: "", category: "Dispensa" }]
    }));
  };

  const updateIngredient = (idx, field, value) => {
    const ings = [...form.ingredients];
    ings[idx] = { ...ings[idx], [field]: value };
    setForm((f) => ({ ...f, ingredients: ings }));
  };

  const removeIngredient = (idx) => {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const addInstruction = () => {
    setForm((f) => ({
      ...f,
      instructions: [...(f.instructions || []), ""]
    }));
  };

  const updateInstruction = (idx, value) => {
    const instr = [...form.instructions];
    instr[idx] = value;
    setForm((f) => ({ ...f, instructions: instr }));
  };

  const removeInstruction = (idx) => {
    setForm((f) => ({
      ...f,
      instructions: f.instructions.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Modifica Ricetta</h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded-lg transition"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-1">Titolo</label>
        <input
          type="text"
          value={form.title || ""}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-1">Descrizione</label>
        <textarea
          value={form.description || ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm resize-none focus:outline-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-1">Categoria</label>
        <select
          value={form.category || "Pranzo"}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-white focus:outline-none"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Difficulty */}
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-1">Difficoltà</label>
        <select
          value={form.difficulty || "Facile"}
          onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-100 text-sm bg-white focus:outline-none"
        >
          {DIFFICULTIES.map((diff) => (
            <option key={diff} value={diff}>{diff}</option>
          ))}
        </select>
      </div>

      {/* Occasions */}
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-2">Occasioni</label>
        <input
          type="text"
          value={(form.occasions || []).join(", ")}
          onChange={(e) => setForm((f) => ({ ...f, occasions: e.target.value.split(",").map((o) => o.trim()) }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-100 text-xs focus:outline-none"
          placeholder="Separate by comma"
        />
      </div>

      {/* Dietary Tags */}
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-2">Dietary Tags</label>
        <div className="flex flex-wrap gap-1">
          {DIETARY_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleDietaryTag(tag)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                (form.dietary_tags || []).includes(tag)
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-gray-50 text-gray-600 border-gray-100"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "prep_time", label: "Tempo (min)" },
          { key: "servings", label: "Porzioni" },
          { key: "calorie", label: "Calorie (kcal)" },
          { key: "proteine", label: "Proteine (g)" },
          { key: "carboidrati", label: "Carboidrati (g)" },
          { key: "grassi", label: "Grassi (g)" },
          { key: "fibre", label: "Fibre (g)" },
          { key: "zuccheri", label: "Zuccheri (g)" },
          { key: "sodio", label: "Sodio (mg)" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-gray-400 font-semibold block mb-0.5">{label}</label>
            <input
              type="number"
              value={form[key] || ""}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-2 py-1.5 rounded-lg border border-gray-100 text-xs focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-gray-400 font-semibold block">Ingredienti</label>
          <button
            onClick={addIngredient}
            className="text-[10px] text-[#2D6A4F] font-bold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Aggiungi
          </button>
        </div>
        <div className="space-y-1">
          {(form.ingredients || []).map((ing, idx) => (
            <div key={idx} className="flex gap-1">
              <input
                type="text"
                placeholder="Nome"
                value={ing.name || ""}
                onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                className="flex-1 px-2 py-1 rounded-lg border border-gray-100 text-xs focus:outline-none"
              />
              <input
                type="text"
                placeholder="Qtà"
                value={ing.quantity || ""}
                onChange={(e) => updateIngredient(idx, "quantity", e.target.value)}
                className="w-20 px-2 py-1 rounded-lg border border-gray-100 text-xs focus:outline-none"
              />
              <select
                value={ing.category || "Dispensa"}
                onChange={(e) => updateIngredient(idx, "category", e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-gray-100 text-xs bg-white focus:outline-none"
              >
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={() => removeIngredient(idx)}
                className="p-1 hover:bg-red-50 rounded-lg transition"
              >
                <X className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-gray-400 font-semibold block">Istruzioni</label>
          <button
            onClick={addInstruction}
            className="text-[10px] text-[#2D6A4F] font-bold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Aggiungi
          </button>
        </div>
        <div className="space-y-1">
          {(form.instructions || []).map((instr, idx) => (
            <div key={idx} className="flex gap-1">
              <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                {idx + 1}
              </span>
              <textarea
                value={instr || ""}
                onChange={(e) => updateInstruction(idx, e.target.value)}
                rows={2}
                className="flex-1 px-2 py-1 rounded-lg border border-gray-100 text-xs resize-none focus:outline-none"
              />
              <button
                onClick={() => removeInstruction(idx)}
                className="p-1 hover:bg-red-50 rounded-lg transition flex-shrink-0"
              >
                <X className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 bg-[#2D6A4F] text-white rounded-xl font-semibold text-sm"
        >
          Salva modifiche
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}