import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Heart, Lock } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "../UserAvatar";
import PremiumUpgradeModal from "./PremiumUpgradeModal";

// Story viewer modal
function StoryViewer({ stories, startIndex, currentUser, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [localStories, setLocalStories] = useState(stories);
  const [isPaused, setIsPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState(null);
  const intervalRef = useRef(null);
  const videoRef = useRef(null);
  const DURATION = 5000;

  const story = localStories[idx];

  useEffect(() => {
    setVideoDuration(null);
    setProgress(0);
  }, [idx]);

  useEffect(() => {
    if (isPaused) return;
    
    const story = localStories[idx];
    const isVideo = story?.media_type === "video";
    const duration = isVideo && videoDuration ? videoDuration * 1000 : DURATION;
    
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + (100 / (duration / 100));
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
  }, [idx, isPaused, videoDuration]);

  const next = () => {
   setIsPaused(false);
   if (idx < localStories.length - 1) setIdx(idx + 1);
   else onClose();
  };
  const prev = () => {
   setIsPaused(false);
   if (idx > 0) setIdx(idx - 1);
  };
  const togglePause = () => {
   setIsPaused(!isPaused);
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
            <div className="border-2 border-white rounded-full">
              <UserAvatar photoUrl={story.user_photo} userName={story.user_name} size="md" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">{story.user_name || "Utente"}</p>
              {isOwner && <p className="text-white/70 text-[10px]">{story.views_count || 0} visualizzazioni</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center bg-black" onClick={togglePause}>
          {story.media_type === "video" ? (
            <video
              ref={videoRef}
              src={story.media_url}
              autoPlay
              muted
              className="w-full h-full object-contain"
              onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
              onEnded={next}
            />
          ) : (
            <img src={story.media_url} alt="" className="w-full h-full object-contain" />
          )}
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
        <button className="absolute left-0 top-0 bottom-0 w-1/3 z-20" onClick={prev} title="Indietro" />
        <button className="absolute right-0 top-0 bottom-0 w-1/3 z-20" onClick={next} title="Avanti" />
      </div>
    </div>
  );
}

// Add story modal
function AddStoryModal({ currentUser, onClose, onCreated }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [captions, setCaptions] = useState({});
  const [uploading, setUploading] = useState(false);
  const [currentPreviewIdx, setCurrentPreviewIdx] = useState(0);

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    const maxTotal = 10;
    if (files.length + newFiles.length > maxTotal) {
      toast.error(`Massimo ${maxTotal} file`);
      return;
    }
    setFiles([...files, ...newFiles]);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
    const newCaptions = { ...captions };
    delete newCaptions[idx];
    setCaptions(newCaptions);
    if (currentPreviewIdx >= files.length - 1 && currentPreviewIdx > 0) {
      setCurrentPreviewIdx(currentPreviewIdx - 1);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      
      // Upload all files and create a story for each
      const uploadPromises = files.map((file) =>
        base44.integrations.Core.UploadFile({ file }).then((res) => res.file_url)
      );
      const urls = await Promise.all(uploadPromises);

      // Create one story per media
      const stories = await Promise.all(
        urls.map((url, idx) =>
          base44.entities.Story.create({
            user_email: currentUser.email,
            user_name: currentUser.full_name || currentUser.email.split("@")[0],
            user_photo: currentUser.photo_url || null,
            media_url: url,
            media_type: files[idx].type.startsWith("video") ? "video" : "image",
            caption: captions[idx]?.trim() || undefined,
            expires_at: expires,
            views_count: 0,
            viewers: [],
            status: "active",
          })
        )
      );

      toast.success(`${stories.length} storie pubblicate!`);
      stories.forEach((s) => onCreated(s));
      onClose();
    } catch (err) {
      toast.error("Errore durante la pubblicazione. Riprova.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (previews.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
        <div
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full overflow-y-auto"
          style={{ maxHeight: "80vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 space-y-4 pb-24">
            <h3 className="font-bold text-gray-900 dark:text-white">Crea storie</h3>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl h-40 cursor-pointer hover:border-[#2D6A4F] transition">
              <Plus className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400">Scegli fino a 10 immagini/video</p>
              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
            </label>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500">Annulla</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full overflow-y-auto"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4 pb-24">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">Crea storie ({previews.length})</h3>
            <button onClick={onClose} className="text-gray-400"><X className="w-5 h-5" /></button>
          </div>

          {/* Preview corrente */}
          <div className="relative rounded-2xl overflow-hidden bg-black h-48">
            {files[currentPreviewIdx].type.startsWith("video") ? (
              <video src={previews[currentPreviewIdx]} className="w-full h-full object-contain" autoPlay muted />
            ) : (
              <img src={previews[currentPreviewIdx]} alt="" className="w-full h-full object-contain" />
            )}
            {files[currentPreviewIdx].type.startsWith("video") && (
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">🎥 Video</div>
            )}
            <button
              onClick={() => removeFile(currentPreviewIdx)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 mr-12"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Miniaturas */}
          {previews.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {previews.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPreviewIdx(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    i === currentPreviewIdx ? "border-[#2D6A4F]" : "border-transparent opacity-70"
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {previews.length < 10 && (
                <label className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#2D6A4F] transition">
                  <Plus className="w-5 h-5 text-gray-400" />
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
                </label>
              )}
            </div>
          )}

          {/* Caption per media corrente */}
          <input
            value={captions[currentPreviewIdx] || ""}
            onChange={(e) => setCaptions({ ...captions, [currentPreviewIdx]: e.target.value })}
            placeholder="Aggiungi didascalia per questo file..."
            className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white outline-none"
          />

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500">Annulla</button>
            <button
              onClick={handleSubmit}
              disabled={uploading || files.length === 0}
              className="flex-1 py-3 rounded-xl bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pubblica (${files.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoriesBar({ currentUser }) {
  const [stories, setStories] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "premium" || currentUser?.role === "admin" || currentUser?.is_expert === true;

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
              } else if (!isPremiumUser) {
                setShowUpgrade(true);
              } else {
                setShowAdd(true);
              }
            }}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="relative w-14 h-14">
              {hasMyStory ? (
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#2D6A4F] to-[#D4A846]">
                  <div className="border-[2.5px] border-white dark:border-[#0F0F0F] rounded-full overflow-hidden">
                    <UserAvatar photoUrl={currentUser.photo_url} userName={currentUser.full_name || currentUser.email} size="lg" />
                  </div>
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
           const storyCount = g.stories.length;
           return (
             <button key={g.email} onClick={() => openGroup(i)} className="flex-shrink-0 flex flex-col items-center gap-1">
               <div className="relative">
                 <div className={`w-14 h-14 rounded-full p-[2px] ${seen ? "bg-gray-300 dark:bg-[#555]" : "bg-gradient-to-tr from-[#2D6A4F] to-[#D4A846]"}`}>
                   <div className="border-[2.5px] border-white dark:border-[#0F0F0F] rounded-full overflow-hidden">
                     <UserAvatar photoUrl={g.user_photo} userName={g.user_name} size="lg" />
                   </div>
                 </div>
                 {/* Story count indicator */}
                 {storyCount > 0 && (
                   <div className="absolute -bottom-0.5 -right-0.5 bg-[#2D6A4F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-[#0F0F0F]">
                     {storyCount > 9 ? "9+" : storyCount}
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

      {showUpgrade && (
        <PremiumUpgradeModal
          reason="creare storie"
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}