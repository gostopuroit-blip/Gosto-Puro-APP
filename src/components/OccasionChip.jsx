import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

const occasionIcons = {
  "Colazione": "🌅",
  "Pranzo": "☀️",
  "Cena": "🌙",
  "Leggera": "🥗",
  "Dolce sano": "🍫",
};

export default function OccasionChip({ label, isDaily = false }) {
  const icon = occasionIcons[label] || "🍽️";
  
  if (isDaily) {
    return (
      <Link
        to={createPageUrl(`Recipes?occasion=${encodeURIComponent(label)}`)}
        className="flex-shrink-0 flex items-center gap-2.5 bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-50 hover:border-[#2D6A4F]/20 hover:shadow-md transition-all duration-200 active:scale-95"
      >
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={createPageUrl(`Recipes?occasion=${encodeURIComponent(label)}`)}
      className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:border-[#2D6A4F]/20 hover:shadow-md transition-all duration-200 active:scale-95"
    >
      <div className="w-10 h-10 rounded-xl bg-[#F0F7F4] flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <span className="text-[13px] font-semibold text-gray-800">{label}</span>
    </Link>
  );
}