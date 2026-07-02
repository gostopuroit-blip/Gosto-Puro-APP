import { useNavigate } from "react-router-dom";
import { X, ShoppingBag, ExternalLink } from "lucide-react";
import { trackEvent } from "@/components/useAnalytics";

// Popup de venda que abre ao tocar no botão de vitrine do post.
export default function ProductPopup({ post, onClose }) {
  const navigate = useNavigate();
  const label = post.cta_label || "Scopri il prodotto";
  const url = post.cta_url || "";
  const image = post.cta_image || (Array.isArray(post.media) ? post.media[0]?.url : null);
  const isInternal = url.startsWith("/");

  const go = () => {
    trackEvent("feed_cta_click", { occasion_label: String(post.id), source: "feed_popup" });
    if (!url) return;
    if (isInternal) {
      onClose?.();
      navigate(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-t-3xl sm:rounded-3xl overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {image && (
          <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-[#0F0F0F]">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#D4A846]">
            <ShoppingBag className="w-3.5 h-3.5" /> In vetrina
          </span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1.5 leading-snug">{label}</h3>
          {post.caption && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{post.caption}</p>
          )}

          <button
            onClick={go}
            className="mt-4 w-full bg-[#2D6A4F] hover:bg-[#235c43] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
          >
            {label}
            {isInternal ? <ShoppingBag className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            {isInternal ? "Apre nell'app" : "Apre la pagina del prodotto"}
          </p>
        </div>
      </div>
    </div>
  );
}
