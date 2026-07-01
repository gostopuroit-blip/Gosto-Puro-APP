import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { markSeen, deleteStory } from "@/api/stories";
import { reportContent } from "@/api/moderation";
import { toast } from "sonner";

const IMG_MS = 5000;

export default function StoryViewer({ groups, startGroup = 0, me, onClose, onChanged }) {
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(0);

  const group = groups[gi];
  const story = group?.stories[si];

  const clearTimer = () => {
    if (timerRef.current) { cancelAnimationFrame(timerRef.current); timerRef.current = null; }
  };

  const goNext = useCallback(() => {
    clearTimer();
    setProgress(0);
    if (group && si < group.stories.length - 1) {
      setSi((v) => v + 1);
    } else if (gi < groups.length - 1) {
      setGi((v) => v + 1);
      setSi(0);
    } else {
      onClose?.();
    }
  }, [group, si, gi, groups.length, onClose]);

  const goPrev = () => {
    clearTimer();
    setProgress(0);
    if (si > 0) setSi((v) => v - 1);
    else if (gi > 0) {
      const pg = groups[gi - 1];
      setGi((v) => v - 1);
      setSi(pg.stories.length - 1);
    }
  };

  // Marca como visto
  useEffect(() => {
    if (story) markSeen(story.id).catch(() => {});
  }, [story?.id]);

  // Auto-avanço (imagem por tempo; vídeo pelo onEnded)
  useEffect(() => {
    if (!story || story.media_type === "video") return;
    startRef.current = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - startRef.current) / IMG_MS);
      setProgress(p);
      if (p >= 1) { goNext(); return; }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
    return clearTimer;
  }, [story?.id, goNext]);

  if (!story) return null;

  const canDelete = story.author_id === me?.id || me?.role === "admin";
  const isOwn = story.author_id === me?.id;

  const report = async () => {
    if (!window.confirm("Segnalare questa storia agli amministratori?")) return;
    try {
      await reportContent({ type: "story", id: story.id, authorId: story.author_id, mediaUrl: story.media_url });
      toast.success("Segnalazione inviata. Grazie!");
    } catch {
      toast.error("Errore nell'invio");
    }
  };

  const onVideoTime = (e) => {
    const v = e.target;
    if (v.duration) setProgress(v.currentTime / v.duration);
  };

  const removeCurrent = async () => {
    if (!window.confirm("Eliminare questa storia?")) return;
    try {
      await deleteStory(story);
      onChanged?.();
      onClose?.();
    } catch {
      // silencioso
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center">
      <div className="relative w-full h-full sm:w-[400px] sm:h-[92vh] sm:max-h-[760px] sm:rounded-2xl overflow-hidden bg-black">
      {/* Barras de progresso */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20">
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: i < si ? "100%" : i === si ? `${progress * 100}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Cabeçalho */}
      <div className="absolute top-4 left-0 right-0 flex items-center gap-2.5 px-3 z-20">
        {group.author_photo ? (
          <img src={group.author_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">
            {(group.author_name || "U").charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-white text-sm font-semibold flex-1 truncate">{group.author_name || "Utente"}</span>
        {!isOwn && (
          <button onClick={report} className="text-white/90 p-1" aria-label="Segnala"><Flag className="w-5 h-5" /></button>
        )}
        {canDelete && (
          <button onClick={removeCurrent} className="text-white/90 p-1"><Trash2 className="w-5 h-5" /></button>
        )}
        <button onClick={onClose} className="text-white p-1"><X className="w-6 h-6" /></button>
      </div>

      {/* Mídia */}
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        {story.media_type === "video" ? (
          <video
            key={story.id}
            src={story.media_url}
            autoPlay
            playsInline
            onTimeUpdate={onVideoTime}
            onEnded={goNext}
            className="w-full h-full object-contain"
          />
        ) : (
          <>
            <img src={story.media_url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
            <img key={story.id} src={story.media_url} alt="" className="relative w-full h-full object-contain" />
          </>
        )}
      </div>

      {/* Zonas de toque + setas */}
      <button onClick={goPrev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="Precedente" />
      <button onClick={goNext} className="absolute right-0 top-0 bottom-0 w-2/3 z-10" aria-label="Successivo" />
      <button onClick={goPrev} className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 text-white items-center justify-center z-20">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={goNext} className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 text-white items-center justify-center z-20">
        <ChevronRight className="w-5 h-5" />
      </button>
      </div>
    </div>
  );
}
