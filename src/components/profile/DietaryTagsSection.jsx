import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2 } from "lucide-react";

const DIETARY_TAGS = [
  { tag: "Senza glutine", icon: "🌾" },
  { tag: "Senza lattosio", icon: "🥛" },
  { tag: "Senza zucchero", icon: "🍬" },
  { tag: "Vegano", icon: "🌱" },
  { tag: "Vegetariano", icon: "🥦" },
  { tag: "Low carb", icon: "🥗" },
  { tag: "Alto contenuto proteico", icon: "💪" },
  { tag: "Diabetico", icon: "🩺" },
  { tag: "Detox", icon: "🌿" },
  { tag: "Fit", icon: "🏋️" },
  { tag: "Senza uova", icon: "🥚" },
  { tag: "Senza frutti di mare", icon: "🦐" },
];

export default function DietaryTagsSection({ initialTags = [] }) {
  const [selected, setSelected] = useState(initialTags);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (tag) => {
    setSaved(false);
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ dietary_tags_profile: selected });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="px-5 mt-4">
      <div className="bg-white dark:bg-[#2D3F35] rounded-3xl p-5 shadow-sm border border-gray-50 dark:border-[#3D5246]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏷️</span>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Le mie restrizioni alimentari</h2>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 leading-relaxed">
          Seleziona le tue restrizioni per vedere ricette adatte a te
        </p>

        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map(({ tag, icon }) => {
            const isSelected = selected.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggle(tag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-sm"
                    : "bg-white dark:bg-[#1A2B20] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#3D5246]"
                }`}
              >
                <span>{icon}</span>
                {tag}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-4 w-full py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            saved
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-[#2D6A4F] text-white hover:bg-[#235c43]"
          }`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Preferenze salvate ✓
            </>
          ) : (
            "Salva preferenze"
          )}
        </button>
      </div>
    </div>
  );
}