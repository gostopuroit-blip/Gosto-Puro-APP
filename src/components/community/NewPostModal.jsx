import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, ImagePlus, Loader2, Image, Lightbulb, UtensilsCrossed, Lock, BarChart2, Plus, Minus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const POST_TYPES = [
  { value: "image_post", label: "Foto", icon: Image, color: "text-blue-500" },
  { value: "tip", label: "Consiglio", icon: Lightbulb, color: "text-amber-500" },
  { value: "recipe", label: "Ricetta", icon: UtensilsCrossed, color: "text-[#2D6A4F]" },
  { value: "poll", label: "Sondaggio", icon: BarChart2, color: "text-indigo-500" },
  { value: "premium_content", label: "Premium", icon: Lock, color: "text-purple-500", expertOnly: true },
];

export default function NewPostModal({ currentUser, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [tags, setTags] = useState("");
  const [postType, setPostType] = useState("image_post");
  const [isPremium, setIsPremium] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Poll state
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Hashtag suggestions
  const [tagInput, setTagInput] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const hashtagInputRef = useRef(null);

  // Recipe selection
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");

  const isExpertOrAdmin = currentUser?.role === "expert" || currentUser?.role === "admin";

  // Load hashtag suggestions
  useEffect(() => {
    if (tagInput.length < 2) {
      setHashtagSuggestions([]);
      return;
    }
    const loadSuggestions = async () => {
      const data = await base44.entities.Hashtag.filter(
        { name: { $regex: `^${tagInput.toLowerCase()}` } },
        "-posts_count",
        5
      ).catch(() => []);
      setHashtagSuggestions(data);
    };
    loadSuggestions();
  }, [tagInput]);

  // Load recipes
  useEffect(() => {
    if (!recipesOpen) return;
    const loadRecipes = async () => {
      setRecipesLoading(true);
      const query = recipeSearch
        ? { title: { $regex: recipeSearch, $options: "i" } }
        : {};
      const data = await base44.entities.Recipe.filter(query, "-created_date", 20).catch(() => []);
      setRecipes(data);
      setRecipesLoading(false);
    };
    const timer = setTimeout(loadRecipes, 300);
    return () => clearTimeout(timer);
  }, [recipesOpen, recipeSearch]);

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, 5 - imageFiles.length);
    if (imageFiles.length + newFiles.length > 5) {
      toast.error("Massimo 5 foto");
      return;
    }
    setImageFiles([...imageFiles, ...newFiles]);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    if (currentImageIndex >= imageFiles.length - 1 && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const addHashtag = (name) => {
    if (hashtags.includes(name)) return;
    setHashtags([...hashtags, name]);
    setTagInput("");
    setHashtagSuggestions([]);
    setShowHashtagSuggestions(false);
  };

  const removeHashtag = (name) => {
    setHashtags(hashtags.filter((h) => h !== name));
  };

  // Extract hashtags from content (words starting with #)
  const extractHashtags = (text) => {
    const matches = text.match(/#\w+/g) || [];
    return matches.map((tag) => tag.slice(1).toLowerCase());
  };

  const handleSubmit = async () => {
    if (!content.trim()) return toast.error("Scrivi qualcosa!");
    if (postType === "poll") {
      if (!title.trim()) return toast.error("Aggiungi una domanda per il sondaggio");
      const validOpts = pollOptions.filter((o) => o.trim());
      if (validOpts.length < 2) return toast.error("Aggiungi almeno 2 opzioni per il sondaggio");
    }
    setUploading(true);

    try {
      let image_url = null;
      if (imagePreviews.length > 0) {
        // Upload first image only (per now, for compatibility)
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFiles[0] });
        image_url = file_url;
      }

      // Combine manually added hashtags with auto-detected ones from content
      const autoTags = extractHashtags(content);
      const allTags = Array.from(new Set([...hashtags, ...autoTags]));

      // Get fresh user data to ensure photo_url is not null
      const freshUser = await base44.auth.me().catch(() => currentUser);
      const photoUrl = freshUser?.photo_url || currentUser?.photo_url || null;

      const post = await base44.entities.CommunityPost.create({
        user_email: currentUser?.email,
        user_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
        user_photo: photoUrl,
        content: content.trim(),
        title: title.trim() || null,
        image_url,
        tags: allTags,
        post_type: postType,
        is_premium: postType === "premium_content" ? true : isPremium,
        linked_recipe_id: selectedRecipe?.id || null,
        likes: [],
        likes_count: 0,
        comments_count: 0,
        is_expert: isExpertOrAdmin,
        status: "active",
      });

      // Create poll if needed
      if (postType === "poll") {
        const validOpts = pollOptions.filter((o) => o.trim());
        await base44.entities.Poll.create({
          user_email: currentUser?.email,
          question: title.trim(),
          options: validOpts.map((o, i) => ({ id: `opt_${i}`, text: o.trim(), votes_count: 0, voters: [] })),
          total_votes: 0,
          post_id: post.id,
          status: "active",
        });
      }

      toast.success("Post pubblicato!");
      onCreated(post);
      onClose();
    } catch (err) {
      console.error("Post submission error:", err);
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
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {availableTypes.map((t) => {
            const Icon = t.icon;
            const active = postType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setPostType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
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
          {/* Title for tip/recipe/premium/poll */}
          {(postType === "tip" || postType === "recipe" || postType === "premium_content" || postType === "poll") && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={postType === "tip" ? "Titolo del consiglio..." : postType === "recipe" ? "Nome della ricetta..." : postType === "poll" ? "Domanda del sondaggio..." : "Titolo del contenuto..."}
              className="w-full text-sm font-semibold bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white outline-none"
            />
          )}

          {/* Multiple images carousel */}
          {imagePreviews.length > 0 && (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden aspect-video w-full bg-black">
                <img src={imagePreviews[currentImageIndex]} alt="" className="w-full h-full object-cover" />
                {imagePreviews.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i - 1 + imagePreviews.length) % imagePreviews.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i + 1) % imagePreviews.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                      {currentImageIndex + 1} / {imagePreviews.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail grid */}
              <div className="flex gap-2 flex-wrap">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2" style={{ borderColor: currentImageIndex === i ? "#2D6A4F" : "transparent" }}>
                    <img src={preview} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setCurrentImageIndex(i)} />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#333] flex items-center justify-center cursor-pointer hover:border-[#2D6A4F] transition">
                    <Plus className="w-4 h-4 text-gray-400" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImages} multiple />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Image upload */}
          {imagePreviews.length === 0 && (
            <label className="block">
              <div className="border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl h-32 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#2D6A4F] transition">
                <ImagePlus className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400">Aggiungi fino a 5 foto</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImages} multiple />
            </label>
          )}

          {/* Text */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === "tip" ? "Condividi il tuo consiglio culinario..."
              : postType === "recipe" ? "Descrivi la ricetta, ingredienti e preparazione..."
              : postType === "premium_content" ? "Contenuto esclusivo per i tuoi follower premium..."
              : "Condividi la tua esperienza culinaria..."
            }
            rows={3}
            className="w-full text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none resize-none"
          />

          {/* Poll options */}
          {postType === "poll" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Opzioni del sondaggio</p>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }}
                    placeholder={`Opzione ${i + 1}`}
                    className="flex-1 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-gray-800 dark:text-white outline-none"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button onClick={() => setPollOptions([...pollOptions, ""])} className="flex items-center gap-1.5 text-xs text-[#2D6A4F] font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Aggiungi opzione
                </button>
              )}
            </div>
          )}

          {/* Hashtag input with suggestions */}
          <div className="relative">
            <div className="flex flex-wrap gap-1.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2.5">
              {hashtags.map((tag) => (
                <div key={tag} className="flex items-center gap-1 bg-[#2D6A4F]/10 text-[#2D6A4F] px-2 py-1 rounded-lg text-xs font-semibold">
                  #{tag}
                  <button onClick={() => removeHashtag(tag)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <input
                ref={hashtagInputRef}
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value.replace("#", "")); setShowHashtagSuggestions(true); }}
                onFocus={() => setShowHashtagSuggestions(true)}
                placeholder={hashtags.length === 0 ? "#tag" : ""}
                className="flex-1 text-sm bg-transparent text-gray-800 dark:text-white outline-none"
              />
            </div>
            {showHashtagSuggestions && hashtagSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-lg max-h-32 overflow-y-auto z-10">
                {hashtagSuggestions.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => addHashtag(h.name)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] flex items-center justify-between"
                  >
                    <span>#{h.name}</span>
                    <span className="text-xs text-gray-400">{h.posts_count || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recipe selector */}
          {postType === "recipe" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Collega una ricetta (opzionale)</p>
              {selectedRecipe ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">{selectedRecipe.title}</p>
                  </div>
                  <button onClick={() => setSelectedRecipe(null)} className="text-green-500 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRecipesOpen(true)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl text-gray-600 dark:text-gray-400 hover:border-[#2D6A4F] transition text-left"
                >
                  Seleziona una ricetta...
                </button>
              )}
            </div>
          )}

          {/* Premium toggle for experts */}
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
              </div>
            </button>
          )}
        </div>

        <Button
           onClick={handleSubmit}
           disabled={uploading || !content.trim()}
           className="mt-4 mb-16 w-full bg-[#2D6A4F] hover:bg-[#235c43] rounded-xl h-11 text-base font-semibold flex-shrink-0">
           {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pubblica"}
        </Button>
      </div>

      {/* Recipe selector modal */}
      {recipesOpen && (
        <div className="fixed inset-0 bg-black/60 z-[51] flex items-end">
          <div className="w-full bg-white dark:bg-[#1A1A1A] rounded-t-3xl p-5 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Seleziona una ricetta</h3>
              <button onClick={() => setRecipesOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder="Cerca ricetta..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl text-gray-800 dark:text-white outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {recipesLoading ? (
                <p className="text-xs text-gray-400 text-center py-4">Caricamento...</p>
              ) : recipes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nessuna ricetta trovata</p>
              ) : (
                recipes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRecipe(r); setRecipesOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#111] border border-gray-100 dark:border-[#2A2A2A] transition"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}