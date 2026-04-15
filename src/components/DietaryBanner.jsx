import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DietaryBanner({ userName, dietaryTags }) {
  if (!dietaryTags || dietaryTags.length === 0) return null;

  return (
    <div className="mx-5 mb-4 bg-[#F0F7F4] dark:bg-[#1A2B20] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 border border-[#2D6A4F]/20">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#2D6A4F] dark:text-[#52b788] leading-snug">
          {userName ? `Ciao ${userName}!` : "Ciao!"} Mostriamo ricette adatte a:
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {dietaryTags.slice(0, 4).join(" · ")}{dietaryTags.length > 4 ? ` +${dietaryTags.length - 4}` : ""}
        </p>
      </div>
      <Link
        to={createPageUrl("Profile")}
        className="flex-shrink-0 text-[11px] font-bold text-[#2D6A4F] dark:text-[#52b788] bg-[#2D6A4F]/10 px-3 py-1.5 rounded-xl"
      >
        Modifica
      </Link>
    </div>
  );
}