import { useRef, useState } from "react";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { createStory } from "@/api/stories";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";

const MAX_MB = 50;

export default function StoryComposer({ me, onClose, onPublished }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { url, type, file }
  const [busy, setBusy] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Il video supera ${MAX_MB}MB`);
      return;
    }
    const finalFile = isVideo ? file : await compressImage(file, { maxSize: 1440, quality: 0.85 });
    setPreview({ url: URL.createObjectURL(finalFile), type: isVideo ? "video" : "image", file: finalFile });
  };

  const publish = async () => {
    if (!preview) { fileRef.current?.click(); return; }
    setBusy(true);
    try {
      const s = await createStory({ file: preview.file, me });
      toast.success("Storia pubblicata! Sparirà tra 24 ore.");
      onPublished?.(s);
    } catch {
      toast.error("Errore nella pubblicazione");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col">
      <div className="flex items-center justify-between p-3">
        <button onClick={onClose} className="text-white"><X className="w-6 h-6" /></button>
        <p className="text-white font-bold text-sm">La tua storia</p>
        <button
          onClick={publish}
          disabled={busy}
          className="text-white font-bold text-sm bg-[#2D6A4F] px-4 py-1.5 rounded-full disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : preview ? "Condividi" : "Scegli"}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {preview ? (
          <div className="relative w-full max-w-[340px] aspect-[9/16] max-h-[78vh] mx-auto rounded-2xl overflow-hidden bg-black">
            {preview.type === "video" ? (
              <video src={preview.url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
            ) : (
              <>
                <img src={preview.url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
                <img src={preview.url} alt="" className="relative w-full h-full object-contain" />
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-3 text-white/70 border-2 border-dashed border-white/25 rounded-2xl px-10 py-14"
          >
            <ImagePlus className="w-10 h-10" />
            <span className="text-sm">Tocca per scegliere foto o video</span>
          </button>
        )}
      </div>

      {preview && (
        <div className="p-3 flex justify-center">
          <button onClick={() => fileRef.current?.click()} className="text-white/70 text-sm">Cambia</button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
