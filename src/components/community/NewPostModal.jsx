import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, ImagePlus, Loader2, Image, Lightbulb, UtensilsCrossed, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const POST_TYPES = [
  { value: "image_post", label: "Foto", icon: Image, color: "text-blue-500" },
  { value: "tip", label: "Dica", icon: Lightbulb, color: "text-amber-500" },
  { value: "recipe", label: "Ricetta", icon: UtensilsCrossed, color: "text-[#2D6A4F]" },
  { value: "premium_content", label: "Premium", icon: Lock, color: "text-purple-500", expertOnly: true },
];

export default function NewPostModal({ currentUser, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tags, setTags] = useState("");
  const [postType, setPostType] = useState("image_post");
  const [isPremium, setIsPremium] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isExpertOrAdmin = currentUser?.role === "expert" || currentUser?.role === "admin";

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return toast.error("Scrivi qualcosa!");
    setUploading(true);

    try {
      let image_url = null;
      if (imageFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        image_url = file_url;
      }

      const tagList = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);

      const post = await base44.entities.CommunityPost.create({
        user_email: currentUser?.email,
        user_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
        user_photo: currentUser?.photo_url || null,
        content: content.trim(),
        title: title.trim() || null,
        image_url,
        tags: tagList,
        post_type: postType,
        is_premium: postType === "premium_content" ? true : isPremium,
        likes: [],
        likes_count: 0,
        comments_count: 0,
        is_expert: isExpertOrAdmin,
        status: "active",
      });

      toast.success("Post pubblicato!");
      onCreated(post);
      onClose();
    } catch (err) {
      toast.error("Errore nella pubblicazione. Riprova.");
    } finally {
      setUploading(false);
    }
  };

  const availableTypes = POST_TYPES.filter((t) => !t.expertOnly || isExpertOrAdmin);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="w-full bg-white dark:bg-[#1A1A1A] rounded-t-3xl p-5 pb-8 max-h-[92vh] flex flex-col" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px) + 1.5rem)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Nuovo post</h2>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post type selector */}
        <div className="flex gap-2 mb-4">
          {availableTypes.map((t) => {
            const Icon = t.icon;
            const active = postType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setPostType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  active
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                    : "bg-gray-50 dark:bg-[#111] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#333]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "" : t.color}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Title for tip/recipe/premium */}
          {(postType === "tip" || postType === "recipe" || postType === "premium_content") && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={postType === "tip" ? "Titolo della dica..." : postType === "recipe" ? "Nome della ricetta..." : "Titolo del contenuto..."}
              className="w-full text-sm font-semibold bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white outline-none"
            />
          )}

          {/* Image */}
          <label className="block">
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video w-full">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl h-32 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#2D6A4F] transition">
                <ImagePlus className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400">Aggiungi foto (opzionale)</p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </label>

          {/* Text */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === "tip" ? "Condividi la tua dica culinaria..."
              : postType === "recipe" ? "Descrivi la ricetta, ingredienti e preparazione..."
              : postType === "premium_content" ? "Contenuto esclusivo per i tuoi follower premium..."
              : "Condividi la tua esperienza culinaria..."
            }
            rows={4}
            className="w-full text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none resize-none"
          />

          {/* Tags */}
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tag: pasta, sano, veloce (separati da virgola)"
            className="w-full text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white outline-none"
          />

          {/* Premium toggle for experts (non-premium_content types) */}
          {isExpertOrAdmin && postType !== "premium_content" && (
            <button
              onClick={() => setIsPremium(!isPremium)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                isPremium
                  ? "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700"
                  : "bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-[#333]"
              }`}
            >
              <Lock className={`w-4 h-4 ${isPremium ? "text-purple-600" : "text-gray-400"}`} />
              <div className="text-left">
                <p className={`text-xs font-semibold ${isPremium ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-400"}`}>
                  {isPremium ? "Contenuto Premium attivo" : "Rendi questo contenuto Premium"}
                </p>
                <p className="text-xs text-gray-400">Solo utenti premium possono vedere</p>
              </div>
            </button>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={uploading || !content.trim()}
          className="mt-4 w-full bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl h-11 text-base font-semibold">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pubblica"}
        </Button>
      </div>
    </div>
  );
}