import { X } from "lucide-react";

export default function LinkPreviewCard({ preview, onRemove }) {
  if (!preview || !preview.url) return null;

  return (
    <button
      onClick={() => window.open(preview.url, "_blank")}
      className="w-full flex gap-3 p-3 border border-gray-200 dark:border-[#333] rounded-xl hover:bg-gray-50 dark:hover:bg-[#111] transition group"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
        />
      )}
      <div className="flex-1 text-left min-w-0">
        <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#40916C]">
          {preview.domain}
        </p>
        {preview.title && (
          <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mt-0.5">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
            {preview.description}
          </p>
        )}
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </button>
  );
}