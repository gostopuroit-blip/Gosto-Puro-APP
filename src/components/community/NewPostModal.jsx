import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, ImagePlus, Loader2, Image, Lightbulb, UtensilsCrossed, Lock, BarChart2, Plus, Minus, ChevronLeft, ChevronRight, Search, Camera, Video, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MentionAutocomplete from "./MentionAutocomplete";
import { extractMentionEmails } from "@/lib/mentionUtils";
import LinkPreviewCard from "./LinkPreviewCard";
import { extractUrlFromText, fetchLinkPreview } from "@/lib/linkPreviewUtils";
import PremiumUpgradeModal from "./PremiumUpgradeModal";
import { checkBadWords, logBadWordViolation } from "@/lib/badWordsFilter";
import { HelpCircle } from "lucide-react";

const POST_TYPES = [
  { value: "image_post", label: "Foto", icon: Image, color: "text-blue-500" },
  { value: "tip", label: "Consiglio", icon: Lightbulb, color: "text-amber-500" },
  { value: "recipe", label: "Ricetta", icon: UtensilsCrossed, color: "text-[#2D6A4F]" },
  { value: "poll", label: "Sondaggio", icon: BarChart2, color: "text-indigo-500" },
  { value: "quiz", label: "Quiz", icon: HelpCircle, color: "text-violet-500" },
  { value: "premium_content", label: "Premium", icon: Lock, color: "text-purple-500", expertOnly: true },
];

export default function NewPostModal({ currentUser, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviews, setVideoPreviews] = useState(null);
  // (removed: tags state was shadowing the local tags variable in handleSubmit)
  const [postType, setPostType] = useState("image_post");
  const [isPremium, setIsPremium] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fileSizeWarning, setFileSizeWarning] = useState(null);

  // Poll state
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Quiz state
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState([
    { id: "opt_0", text: "", is_correct: false },
    { id: "opt_1", text: "", is_correct: false },
  ]);
  const [quizExplanation, setQuizExplanation] = useState("");
  const [quizExpiresAt, setQuizExpiresAt] = useState("");

  // Mentions state
  const [mentionedUsers, setMentionedUsers] = useState([]);

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

  // Link preview state
  const [linkPreview, setLinkPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const isExpertOrAdmin = currentUser?.role === "expert" || currentUser?.role === "admin";
  const isPremiumUser = currentUser?.plan === "premium" || currentUser?.role === "premium" || currentUser?.role === "admin" || currentUser?.is_expert === true;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Bad words state
  const [badWordError, setBadWordError] = useState(null); // {severity, word}
  const [forcePublish, setForcePublish] = useState(false);
  const isPublishingRef = useRef(false);

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

  // Auto-detect URL in content and fetch preview
  useEffect(() => {
    const detectAndFetchUrl = async () => {
      const url = extractUrlFromText(content);
      if (url) {
        setLoadingPreview(true);
        const preview = await fetchLinkPreview(url);
        if (preview) {
          setLinkPreview(preview);
        } else {
          // Fallback: set preview with just the URL
          setLinkPreview({
            url,
            title: null,
            description: null,
            image: null,
            domain: new URL(url).hostname.replace("www.", ""),
          });
        }
        setLoadingPreview(false);
      } else {
        setLinkPreview(null);
      }
    };

    const timer = setTimeout(detectAndFetchUrl, 500);
    return () => clearTimeout(timer);
  }, [content]);

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

  const handleVideo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setFileSizeWarning("Il file è più grande di 100MB");
      return;
    }
    setFileSizeWarning(null);

    setVideoFile(file);
    const preview = URL.createObjectURL(file);
    setVideoPreviews(preview);
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
    const matches = text.match(/#(\w+)/g) || [];
    return matches.map((tag) => tag.slice(1).toLowerCase());
  };

  const handleSubmit = async () => {
    if (isPublishingRef.current) return; // Prevent double submit
    if (!content.trim()) return toast.error("Scrivi qualcosa!");
    if (postType === "poll") {
      if (!title.trim()) return toast.error("Aggiungi una domanda per il sondaggio");
      const validOpts = pollOptions.filter((o) => o.trim());
      if (validOpts.length < 2) return toast.error("Aggiungi almeno 2 opzioni per il sondaggio");
    }
    if (postType === "quiz") {
      if (!quizQuestion.trim()) return toast.error("Aggiungi una domanda per il quiz");
      const validOpts = quizOptions.filter((o) => o.text.trim());
      if (validOpts.length < 2) return toast.error("Aggiungi almeno 2 opzioni");
      if (!quizOptions.some((o) => o.is_correct)) return toast.error("Segna almeno una risposta corretta");
    }
    if (fileSizeWarning) return toast.error(fileSizeWarning);

    // Bad words check (skip if user already confirmed warning)
    if (!forcePublish) {
      const textToCheck = [title, content].filter(Boolean).join(" ");
      const check = await checkBadWords(textToCheck);
      if (check.hasBadWord) {
        if (check.severity === "block") {
          // Log violation and block
          logBadWordViolation({ userEmail: currentUser?.email, content: textToCheck, context: "post" });
          setBadWordError({ severity: "block", word: check.word });
          return;
        } else {
          // Warning: ask user
          setBadWordError({ severity: "warning", word: check.word });
          return;
        }
      }
    }

    setBadWordError(null);
    setForcePublish(false);
    isPublishingRef.current = true;
    setUploading(true);

    try {
      let image_url = null;
      let images = [];
      let video_url = null;
      let media_type = null;

      // Upload video if present
      if (videoFile) {
        const res = await base44.integrations.Core.UploadFile({ file: videoFile });
        video_url = res.file_url;
        media_type = "video";
      } else if (imagePreviews.length > 0) {
        // Upload all images and save URLs
        const uploadPromises = imageFiles.map((file) =>
          base44.integrations.Core.UploadFile({ file }).then((res) => res.file_url)
        );
        images = await Promise.all(uploadPromises);
        image_url = images[0]; // First image as primary
        media_type = "image";
      }

      // Extract ALL hashtags from content + merge with manually added hashtags
      const tags = (content.match(/#([\w-]+)/g) || []).map(t => t.slice(1).toLowerCase());
      const allTags = [...new Set([...tags, ...hashtags])];

      // Extract mention emails from content
      const mentionEmails = await extractMentionEmails(content, base44);

      // Get fresh user data to ensure photo_url is set
      const freshUser = await base44.auth.me().catch(() => currentUser);
      const photoUrl = freshUser?.photo_url || currentUser?.photo_url || null;

      const post = await base44.entities.CommunityPost.create({
        user_email: currentUser?.email,
        user_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
        user_photo: photoUrl || null,
        content: content.trim(),
        title: title.trim() || null,
        image_url,
        images: images.length > 0 ? images : [],
        video_url,
        media_type,
        tags: allTags,
        mentions: mentionEmails,
        post_type: postType,
        is_premium: postType === "premium_content" ? true : isPremium,
        linked_recipe_id: selectedRecipe?.id || null,
        link_preview: linkPreview || null,
        likes: [],
        likes_count: 0,
        comments_count: 0,
        is_expert: isExpertOrAdmin,
        author_role: currentUser?.role || null,
        author_plan: currentUser?.plan || null,
        author_id: currentUser?.id || null,
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

      // Create quiz if needed
      if (postType === "quiz") {
        const validOpts = quizOptions.filter((o) => o.text.trim()).map((o) => ({
          ...o,
          votes_count: 0,
          voters: [],
        }));
        await base44.entities.Quiz.create({
          user_email: currentUser?.email,
          post_id: post.id,
          question: quizQuestion.trim(),
          options: validOpts,
          explanation: quizExplanation.trim() || null,
          expires_at: quizExpiresAt || null,
          total_answers: 0,
          correct_answers: 0,
          status: "active",
        });
      }

      // Create mention notifications
      if (mentionEmails.length > 0) {
        mentionEmails.forEach((email) => {
          base44.functions.invoke('createMentionNotification', {
            recipient_email: email,
            sender_name: currentUser?.full_name || currentUser?.email?.split("@")[0],
            post_id: post.id,
            type: "post_mention",
          }).catch(() => {});
        });
      }

      toast.success("Post pubblicato!");
      onCreated(post);
      onClose();
    } catch (err) {
      console.error("Post submission error:", err);
      toast.error("Errore nella pubblicazione. Riprova.");
    } finally {
      isPublishingRef.current = false;
      setUploading(false);
    }
  };

  const availableTypes = POST_TYPES.filter((t) => !t.expertOnly || isExpertOrAdmin);

  // Block free users from posting
  if (!isPremiumUser) {
    return (
      <PremiumUpgradeModal
        reason="pubblicare"
        onClose={onClose}
      />
    );
  }

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

          {/* Video preview */}
          {videoPreviews && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Anteprima del video</p>
              <div className="relative rounded-2xl overflow-hidden aspect-video w-full bg-black">
                <video src={videoPreviews} className="w-full h-full object-cover" />
                <button
                  onClick={() => { setVideoFile(null); setVideoPreviews(null); }}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-2 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {fileSizeWarning && (
                <p className="text-xs text-red-500 font-medium">{fileSizeWarning}</p>
              )}
            </div>
          )}

          {/* Image preview with clear controls */}
          {imagePreviews.length > 0 && !videoFile && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Anteprima della foto</p>
              <div className="relative rounded-2xl overflow-hidden aspect-video w-full bg-black">
                <img src={imagePreviews[currentImageIndex]} alt="" className="w-full h-full object-cover" />
                {imagePreviews.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i - 1 + imagePreviews.length) % imagePreviews.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 hover:bg-black/70 transition"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i + 1) % imagePreviews.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 hover:bg-black/70 transition"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                      {currentImageIndex + 1} / {imagePreviews.length}
                    </div>
                  </>
                )}
                <button
                  onClick={() => removeImage(currentImageIndex)}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-2 transition"
                  title="Rimuovi questa foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Thumbnail grid */}
              {imagePreviews.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {imagePreviews.map((preview, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border-2 transition hover:opacity-75"
                      style={{ borderColor: currentImageIndex === i ? "#2D6A4F" : "transparent" }}
                    >
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {imagePreviews.length < 5 && (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#333] flex items-center justify-center cursor-pointer hover:border-[#2D6A4F] transition">
                      <Plus className="w-4 h-4 text-gray-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImages} multiple />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Media upload */}
          {imagePreviews.length === 0 && !videoFile && (
            <div className="space-y-2">
              <label className="block">
                <div className="border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl h-32 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#2D6A4F] transition">
                  <Camera className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Carica foto o video</p>
                  <p className="text-xs text-gray-400">Fino a 5 foto o 1 video (max 100MB)</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImages} multiple />
              </label>
              <label className="block">
                <div className="border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl h-20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#2D6A4F] transition">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm10 3V7a1 1 0 10-2 0v2H7a1 1 0 100 2h3v2a1 1 0 102 0v-2h3a1 1 0 100-2h-3z" />
                  </svg>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Carica un video</p>
                </div>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideo} />
              </label>
            </div>
          )}

          {/* Text with mention autocomplete */}
          <MentionAutocomplete
            value={content}
            onChange={setContent}
            onMentionSelect={(user) => setMentionedUsers([...mentionedUsers, user])}
            currentUser={currentUser}
          />

          {/* Link preview */}
          {linkPreview && (
            <LinkPreviewCard 
              preview={linkPreview}
              onRemove={() => setLinkPreview(null)}
            />
          )}

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

          {/* Quiz fields */}
          {postType === "quiz" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Domanda del quiz</p>
              <input
                value={quizQuestion}
                onChange={(e) => setQuizQuestion(e.target.value)}
                placeholder="Es: Quale vitamina è prodotta dal sole?"
                className="w-full text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white outline-none"
              />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Opzioni (seleziona quella corretta)</p>
              {quizOptions.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuizOptions(quizOptions.map((o, j) => ({ ...o, is_correct: j === i })))}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                      opt.is_correct ? "border-green-500 bg-green-500" : "border-gray-300 dark:border-[#444]"
                    }`}
                  >
                    {opt.is_correct && <div className="w-full h-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                  </button>
                  <input
                    value={opt.text}
                    onChange={(e) => setQuizOptions(quizOptions.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                    placeholder={`Opzione ${i + 1}`}
                    className="flex-1 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-gray-800 dark:text-white outline-none"
                  />
                  {quizOptions.length > 2 && (
                    <button onClick={() => setQuizOptions(quizOptions.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {quizOptions.length < 4 && (
                <button
                  onClick={() => setQuizOptions([...quizOptions, { id: `opt_${quizOptions.length}`, text: "", is_correct: false }])}
                  className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi opzione
                </button>
              )}
              <input
                value={quizExplanation}
                onChange={(e) => setQuizExplanation(e.target.value)}
                placeholder="Spiegazione (opzionale) — mostrata dopo aver risposto"
                className="w-full text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white outline-none"
              />
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Data di scadenza (opzionale)</p>
                <input
                  type="datetime-local"
                  value={quizExpiresAt}
                  onChange={(e) => setQuizExpiresAt(e.target.value)}
                  placeholder="gg/mm/aaaa --:--"
                  className="w-full text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white outline-none"
                />
              </div>
            </div>
          )}

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

        {/* Bad word feedback */}
        {badWordError && (
          <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium space-y-2 ${
            badWordError.severity === "block"
              ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
          }`}>
            <p>
              {badWordError.severity === "block"
                ? "⚠️ Il tuo post contiene linguaggio offensivo. Rimuovi i termini inappropriati per continuare."
                : "⚠️ Attenzione: il tuo post potrebbe contenere contenuto inappropriato."}
            </p>
            {badWordError.severity === "warning" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setBadWordError(null)}
                  className="flex-1 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-700"
                >
                  Modifica
                </button>
                <button
                  onClick={() => { setForcePublish(true); setBadWordError(null); setTimeout(handleSubmit, 0); }}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold"
                >
                  Pubblica comunque
                </button>
              </div>
            )}
          </div>
        )}

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