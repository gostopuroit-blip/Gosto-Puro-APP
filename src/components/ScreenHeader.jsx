import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Root pages get the logo header; child pages get a back button + title
const ROOT_PAGES = ["Home", "Recipes", "Folders", "Planner", "Profile"];

export default function ScreenHeader({ title, backTo }) {
  const navigate = useNavigate();
  const isRoot = !backTo;

  if (isRoot) {
    // Logo bar for root pages
    return (
      <div className="flex items-center justify-center px-5 pt-12 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold tracking-tight text-[#2D6A4F]">Gusto Puro</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 pt-12 pb-2">
      <button
        onClick={() => navigate(backTo || -1)}
        className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 active:scale-90 transition-transform"
      >
        <ArrowLeft className="w-4 h-4 text-gray-700" />
      </button>
      {title && (
        <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate flex-1">{title}</h1>
      )}
    </div>
  );
}