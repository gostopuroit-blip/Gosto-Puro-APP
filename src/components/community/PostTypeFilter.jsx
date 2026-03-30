import { Image, Lightbulb, UtensilsCrossed, BarChart2 } from "lucide-react";

const FILTER_OPTIONS = [
  { value: null, label: "Todos", icon: null },
  { value: "image_post", label: "Fotos", icon: Image, color: "text-blue-500" },
  { value: "tip", label: "Consigli", icon: Lightbulb, color: "text-amber-500" },
  { value: "recipe", label: "Ricette", icon: UtensilsCrossed, color: "text-[#2D6A4F]" },
  { value: "poll", label: "Sondaggi", icon: BarChart2, color: "text-indigo-500" },
];

export default function PostTypeFilter({ selected, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {FILTER_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = selected === option.value;
        return (
          <button
            key={option.value || "all"}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
              active
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                : "bg-gray-50 dark:bg-[#111] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#333]"
            }`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 ${active ? "" : option.color}`} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}