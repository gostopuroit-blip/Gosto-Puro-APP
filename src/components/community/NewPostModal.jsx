import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function NewPostModal({ currentUser, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return toast.error("Scrivi qualcosa!");
    setUploading(true);

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
      image_url,
      tags: tagList,
      likes: [],
      likes_count: 0,
      comments_count: 0,
      is_expert: currentUser?.role === "expert" || currentUser?.role === "admin",
      status: "active",
    });

    toast.success("Post pubblicato!");
    onCreated(post);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="w-full bg-white dark:bg-[#1A1A1A] rounded-t-3xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Nuovo post</h2>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Image */}
          <label className="block">
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden aspect-square w-full">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#2D6A4F] transition">
                <ImagePlus className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400">Aggiungi foto (opzionale)</p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </label>

          {/* Text */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Condividi la tua esperienza culinaria..."
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