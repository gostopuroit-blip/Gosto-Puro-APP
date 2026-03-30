import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Heart } from "lucide-react";
import { toast } from "sonner";

// Story viewer modal
function StoryViewer({ stories, startIndex, currentUser, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [localStories, setLocalStories] = useState(stories);
  const intervalRef = useRef(null);
  const DURATION = 5000;

  const story = localStories[idx];

  useEffect(() => {
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + (100 / (DURATION / 100));
      });
    }, 100);
    // Register view
    if (story && currentUser && !story.viewers?.includes(currentUser.email)) {
      const newViewers = [...(story.viewers || []), currentUser.email];
      base44.entities.Story.update(story.id, {
        viewers: newViewers,
        views_count: newViewers.length,
      }).catch(() => {});
    }
    return () => clearInterval(intervalRef.current);
  }, [idx]);

  const next = () => {
    if (idx < localStories.length - 1) setIdx(idx + 1);
    else onClose();
  };
  const prev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    if (!currentUser) return toast.error("Fai login per mettere mi piace");
    const likes = story.likes || [];
    const isLiked = likes.includes(currentUser.email);
    const newLikes = isLiked ? likes.filter((e) => e !== currentUser.email) : [...likes, currentUser.email];
    base44.entities.Story.update(story.id, { likes: newLikes, likes_count: newLikes.length }).catch(() => {});
    setLocalStories((prev) => prev.map((s, i) => i === idx ? { ...s, likes: newLikes, likes_count: newLikes.length } : s));
  };

  if (!story) return null;

  const isOwner = story.created_by === currentUser?.email;
  const isLiked = story.likes?.includes(currentUser?.email);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-sm h-full max-h-[100dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {localStories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            {story.user_photo ? (
              <img src={story.user_photo} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white" style={{ imageRendering: "auto" }} />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                {(story.user_name || "U").charAt(0)}
              </div>
            )}
            <div>
              <p className="text-white text-xs font-semibold">{story.user_name || "Utente"}</p>
              {isOwner && <p className="text-white/70 text-[10px]">{story.views_count || 0} visualizzazioni</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center bg-black">
          <img src={story.media_url} alt="" className="w-full h-full object-contain" />
        </div>

        {/* Caption + Like */}
        <div className="absolute bottom-8 left-0 right-0 px-4 flex items-center justify-between">
          {story.caption ? (
            <p className="text-white text-sm font-medium drop-shadow-lg flex-1 text-center">{story.caption}</p>
          ) : <div className="flex-1" />}
          {!isOwner && (
            <button onClick={handleLike} className="flex flex-col items-center gap-0.5 ml-3 flex-shrink-0">
              <Heart className={`w-7 h-7 drop-shadow-lg transition-all ${isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
              {(story.likes_count || 0) > 0 && (
                <span className="text-white text-xs font-semibold drop-shadow">{story.likes_count}</span>
              )}
            </button>
          )}
        </div>

        {/* Tap zones */}
        <button className="absolute left-0 top-0 bottom-0 w-1/3 z-20" onClick={prev} />
        <button className="absolute right-0 top-0 bottom-0 w-1/3 z-20" onClick={next} />
      </div>
    </div>
  );
}

// Add story modal
function AddStoryModal({ currentUser, onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const story = await base44.entities.Story.create({
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email.split("@")[0],
        user_photo: currentUser.photo_url || null,
        media_url: file_url,
        media_type: "image",
        caption: caption.trim() || undefined,
        expires_at: expires,
        views_count: 0,
        viewers: [],
        status: "active",
      });
      toast.success("Story pubblicata!");
      onCreated(story);
      onClose();
    } catch (err) {
      toast.error("Errore durante la pubblicazione. Riprova.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full overflow-y-auto"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4 pb-24">
          <h3 className="font-bold text-gray-900 dark:text-white">Crea Story</h3>
          {!preview ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl h-40 cursor-pointer">
              <Plus className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400">Tocca per scegliere un'immagine</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden h-40">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => { setPreview(null); setFile(null); }} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"><X className="w-4 h-4" /></button>
            </div>
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Aggiungi una didascalia..."
            className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white outline-none"
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500">Annulla</button>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="flex-1 py-3 rounded-xl bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pubblica"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoriesBar({ currentUser }) {
  const [stories, setStories] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(null); // index
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    base44.entities.Story.filter({ status: "active" }, "-created_date", 50).then((data) => {
      // Filter expired
      const now = new Date();
      setStories(data.filter((s) => !s.expires_at || new Date(s.expires_at) > now));
    });
  }, []);

  // Group by user
  const grouped = {};
  stories.forEach((s) => {
    const key = s.user_email || s.created_by;
    if (!grouped[key]) grouped[key] = { user_name: s.user_name, user_photo: s.user_photo, email: key, stories: [] };
    grouped[key].stories.push(s);
  });
  const groups = Object.values(grouped);

  const myStories = stories.filter((s) => s.created_by === currentUser?.email);
  const hasMyStory = myStories.length > 0;

  const flatStories = groups.flatMap((g) => g.stories);

  const openGroup = (groupIdx) => {
    const groupStories = groups[groupIdx].stories;
    const firstIdx = flatStories.indexOf(groupStories[0]);
    setViewerOpen(firstIdx);
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 py-3">
        {/* Add story */}
        {currentUser && (
          <button
            onClick={() => {
              if (hasMyStory) {
                const myGroupIdx = groups.findIndex((g) => g.email === currentUser.email);
                if (myGroupIdx !== -1) openGroup(myGroupIdx);
              } else {
                setShowAdd(true);
              }
            }}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="relative w-14 h-14">
              {hasMyStory ? (
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#2D6A4F] to-[#D4A846]">
                  {currentUser.photo_url ? (
                    <img src={currentUser.photo_url} alt="" className="w-full h-full rounded-full object-cover border-[2.5px] border-white dark:border-[#0F0F0F]" style={{ imageRendering: "auto" }} />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold border-[2.5px] border-white dark:border-[#0F0F0F]">
                      {(currentUser.full_name || currentUser.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-[#2A2A2A] border-2 border-dashed border-gray-300 dark:border-[#444] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
              )}
              {!hasMyStory && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#2D6A4F] rounded-full flex items-center justify-center border-2 border-white dark:border-[#0F0F0F]">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 w-14 text-center truncate">
              {hasMyStory ? "La tua" : "Aggiungi"}
            </p>
          </button>
        )}

        {/* Stories per user */}
        {groups.map((g, i) => {
          if (g.email === currentUser?.email) return null;
          const seen = g.stories.every((s) => s.viewers?.includes(currentUser?.email));
          return (
            <button key={g.email} onClick={() => openGroup(i)} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-full p-[2px] ${seen ? "bg-gray-200 dark:bg-[#333]" : "bg-gradient-to-tr from-[#2D6A4F] to-[#D4A846]"}`}>
                {g.user_photo ? (
                  <img src={g.user_photo} alt="" className="w-full h-full rounded-full object-cover border-[2.5px] border-white dark:border-[#0F0F0F]" style={{ imageRendering: "auto" }} />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold border-[2.5px] border-white dark:border-[#0F0F0F]">
                    {(g.user_name || "U").charAt(0)}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 w-14 text-center truncate">{g.user_name || "Utente"}</p>
            </button>
          );
        })}
      </div>

      {viewerOpen !== null && (
        <StoryViewer
          stories={flatStories}
          startIndex={viewerOpen}
          currentUser={currentUser}
          onClose={() => setViewerOpen(null)}
        />
      )}

      {showAdd && currentUser && (
        <AddStoryModal
          currentUser={currentUser}
          onClose={() => setShowAdd(false)}
          onCreated={(s) => setStories((prev) => [s, ...prev])}
        />
      )}
    </>
  );
}