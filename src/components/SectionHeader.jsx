import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { ChevronRight } from "lucide-react";

export default function SectionHeader({ title, linkPage, linkLabel = "Vedi tutto" }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
      {linkPage && (
        <Link
          to={createPageUrl(linkPage)}
          className="flex items-center gap-0.5 text-[#2D6A4F] dark:text-[#40916C] text-xs font-semibold hover:underline"
        >
          {linkLabel}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}