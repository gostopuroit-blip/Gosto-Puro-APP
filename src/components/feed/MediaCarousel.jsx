import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Carrossel estilo Instagram: a proporção do post segue a PRIMEIRA mídia
// (limitada entre retrato 0.7 e paisagem 1.91), sem cortar o conteúdo.
export default function MediaCarousel({ media = [] }) {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState(0.8); // default retrato leve até medir
  const items = Array.isArray(media) ? media.filter((m) => m && m.url) : [];

  if (items.length === 0) return null;

  const setFromFirst = (w, h) => {
    if (!w || !h) return;
    setRatio(Math.min(1.91, Math.max(0.7, w / h)));
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const go = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative bg-black group">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full"
        style={{ aspectRatio: String(ratio) }}
      >
        {items.map((m, i) => (
          <div key={i} className="snap-center shrink-0 w-full h-full relative overflow-hidden">
            {m.type === "video" ? (
              <video
                src={m.url}
                poster={m.poster || undefined}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={i === 0 ? (e) => setFromFirst(e.target.videoWidth, e.target.videoHeight) : undefined}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <>
                {/* Preenche as laterais com a própria imagem borrada (em vez de barra preta) */}
                <img
                  src={m.url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70"
                />
                <img
                  src={m.url}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  onLoad={i === 0 ? (e) => setFromFirst(e.target.naturalWidth, e.target.naturalHeight) : undefined}
                  className="relative w-full h-full object-contain"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          {/* Setas desktop (hover) — no mobile usa-se o swipe */}
          {index > 0 && (
            <button
              onClick={() => go(-1)}
              aria-label="Immagine precedente"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-gray-800 items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {index < items.length - 1 && (
            <button
              onClick={() => go(1)}
              aria-label="Immagine successiva"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-gray-800 items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="absolute top-2.5 right-2.5 bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {index + 1}/{items.length}
          </div>
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
