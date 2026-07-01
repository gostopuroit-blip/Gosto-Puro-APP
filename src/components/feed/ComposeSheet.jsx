import { useRef, useState } from "react";
import { X, ImagePlus, Loader2, Film, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPost } from "@/api/feed";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";

const MAX_ITEMS = 10;
const MAX_MB = 100;

// Tags = sinais de interesse que alimentam a recomendação personalizada
const TAG_OPTIONS = [
  "Fit", "Diabete", "Senza Zucchero", "Proteico", "Leggera", "Dolci",
  "Colazione", "Pranzo", "Cena", "Vegetariano", "Estate", "Veloce",
];

export default function ComposeSheet({ me, onClose, onPublished }) {
  const fileRef = useRef(null);
  const [media, setMedia] = useState([]); // {url, type, poster?}
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const toggleTag = (t) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const pick = () => fileRef.current?.click();

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    if (media.length + files.length > MAX_ITEMS) {
      toast.error(`Massimo ${MAX_ITEMS} file per post`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        // Vídeo respeita o limite; imagem é comprimida no cliente antes de subir
        if (isVideo && file.size > MAX_MB * 1024 * 1024) {
          toast.error(`${file.name} supera ${MAX_MB}MB`);
          continue;
        }
        const toUpload = isVideo ? file : await compressImage(file);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: toUpload, bucket: "feed" });
        setMedia((prev) => [...prev, { url: file_url, type: isVideo ? "video" : "image" }]);
      }
    } catch (err) {
      toast.error("Errore nel caricamento");
    } finally {
      setUploading(false);
    }
  };

  const removeItem = (i) => setMedia((prev) => prev.filter((_, idx) => idx !== i));

  const move = (from, to) => {
    if (to < 0 || to >= media.length) return;
    setMedia((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const publish = async () => {
    if (media.length === 0) { toast.error("Aggiungi almeno una foto o un video"); return; }
    setPublishing(true);
    try {
      const post = await createPost({ media, caption, me, tags });
      toast.success("Post pubblicato!");
      onPublished?.(post);
    } catch {
      toast.error("Errore nella pubblicazione");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-[#1A1A1A] rounded-t-3xl flex flex-col max-h-[92vh]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#333]">
          <button onClick={onClose} className="text-gray-400"><X className="w-6 h-6" /></button>
          <p className="font-bold text-gray-900 dark:text-gray-100">Nuovo post</p>
          <button
            onClick={publish}
            disabled={publishing || uploading || media.length === 0}
            className="text-[#2D6A4F] font-bold text-sm disabled:opacity-40"
          >
            {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pubblica"}
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Grid de mídia */}
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
              <div key={m.url} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-[#0F0F0F]">
                {m.type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <Film className="w-7 h-7 text-white/80" />
                    <video src={m.url} className="absolute inset-0 w-full h-full object-cover opacity-70" muted />
                  </div>
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}

                {/* Número da ordem / capa */}
                {i === 0 ? (
                  <span className="absolute top-1 left-1 bg-[#2D6A4F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    Copertina
                  </span>
                ) : (
                  <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                )}

                <button
                  onClick={() => removeItem(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Reordenar */}
                {media.length > 1 && (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                    <button
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Sposta indietro"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => move(i, i + 1)}
                      disabled={i === media.length - 1}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Sposta avanti"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {media.length < MAX_ITEMS && (
              <button
                onClick={pick}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-[#333] flex flex-col items-center justify-center gap-1 text-gray-400"
              >
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                <span className="text-[11px]">{uploading ? "Carico..." : "Aggiungi"}</span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={onFiles}
          />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            placeholder="Scrivi una didascalia... (ricetta, consiglio, ingredienti)"
            className="w-full bg-gray-50 dark:bg-[#0F0F0F] rounded-xl px-3.5 py-3 text-sm outline-none resize-none border border-gray-100 dark:border-[#333]"
          />

          {/* Tags de interesse (recomendação) */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Argomenti (aiutano a consigliare il post)</p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                      on
                        ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                        : "bg-white dark:bg-[#0F0F0F] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Foto, carosello o video corto (fino a {MAX_MB}MB). Il post apparirà nel feed di tutti gli utenti.
          </p>
        </div>
      </div>
    </div>
  );
}
