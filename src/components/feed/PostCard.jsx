import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, BadgeCheck, Trash2, Eye, Flag } from "lucide-react";
import MediaCarousel from "./MediaCarousel";
import CommentsSheet, { Avatar, timeAgo } from "./CommentsSheet";
import CreatorProfileSheet from "./CreatorProfileSheet";
import ProductPopup from "./ProductPopup";
import { ShoppingBag } from "lucide-react";
import { toggleLike, toggleSave, deletePost, recordView } from "@/api/feed";
import { reportContent } from "@/api/moderation";
import { toast } from "sonner";
import { trackEvent } from "@/components/useAnalytics";

// Transforma URLs da legenda em links clicáveis (http/https e www.).
// Legendas vêm só de admin/expert (conteúdo confiável).
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
function linkify(text) {
  const out = [];
  let last = 0;
  const re = new RegExp(URL_RE);
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    let raw = m[0];
    // não engole pontuação final comum
    let trail = "";
    const tm = raw.match(/[.,;:!?)]+$/);
    if (tm) { trail = tm[0]; raw = raw.slice(0, -trail.length); }
    const href = raw.startsWith("http") ? raw : "https://" + raw;
    out.push(
      <a
        key={`${m.index}-${raw}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-[#2D6A4F] font-medium underline break-all"
      >
        {raw}
      </a>
    );
    if (trail) out.push(trail);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function PostCard({ post, me, onDeleted, disableProfile = false }) {
  const [liked, setLiked] = useState(!!post.liked);
  const [saved, setSaved] = useState(!!post.saved);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const openProfile = () => { if (!disableProfile) setShowProfile(true); };

  const isAuthor = post.author_id === me?.id;
  const canDelete = me?.role === "admin" || isAuthor;
  const canSeeInsights = me?.role === "admin" || isAuthor;

  const report = async () => {
    setMenuOpen(false);
    if (!window.confirm("Segnalare questo post agli amministratori?")) return;
    try {
      await reportContent({
        type: "post",
        id: post.id,
        authorId: post.author_id,
        snapshot: post.caption,
        mediaUrl: Array.isArray(post.media) ? post.media[0]?.url : null,
      });
      toast.success("Segnalazione inviata. Grazie!");
    } catch {
      toast.error("Errore nell'invio");
    }
  };
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const hasCta = !!(post.cta_label && post.cta_url);

  // Registra a visualização (1x por montagem)
  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    recordView(post.id).catch(() => {});
  }, [post.id]);

  const onLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await toggleLike(post.id, liked);
      if (next) trackEvent("feed_like", { post_id: post.id });
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const onSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await toggleSave(post.id, saved);
      if (next) trackEvent("feed_save", { post_id: post.id });
    } catch {
      setSaved(!next);
    }
  };

  const onDelete = async () => {
    setMenuOpen(false);
    if (!window.confirm("Eliminare questo post?")) return;
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch {
      // silencioso
    }
  };

  const caption = post.caption || "";
  const longCaption = caption.length > 140;

  return (
    <article className="bg-white dark:bg-[#1A1A1A] sm:rounded-2xl sm:border border-gray-100 dark:border-[#333] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <button onClick={openProfile} className="flex-shrink-0" aria-label="Profilo">
          <Avatar name={post.author_name} photo={post.author_photo} size={38} />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={openProfile} className="flex items-center gap-1 text-left">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {post.author_name || "Gosto Puro"}
            </span>
            <BadgeCheck
              className={`w-4 h-4 flex-shrink-0 ${post.author_role === "admin" ? "text-[#D4A846]" : "text-[#2D6A4F]"}`}
            />
          </button>
          <span className="text-[11px] text-gray-400">
            {post.author_role === "admin" ? "Gosto Puro" : "Expert"} · {timeAgo(post.created_at)}
          </span>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="w-8 h-8 flex items-center justify-center text-gray-400">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 bg-white dark:bg-[#242424] rounded-xl shadow-lg border border-gray-100 dark:border-[#333] py-1 w-40">
                {!isAuthor && (
                  <button
                    onClick={report}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333]"
                  >
                    <Flag className="w-4 h-4" /> Segnala
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-[#333]"
                  >
                    <Trash2 className="w-4 h-4" /> Elimina post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mídia */}
      <MediaCarousel media={post.media} />

      {/* Ações */}
      <div className="flex items-center gap-4 px-3.5 pt-2.5">
        <button onClick={onLike} className="flex items-center gap-1.5 active:scale-90 transition">
          <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "text-gray-700 dark:text-gray-200"}`} />
        </button>
        <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5 active:scale-90 transition">
          <MessageCircle className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
        <button onClick={onSave} className="ml-auto active:scale-90 transition">
          <Bookmark className={`w-6 h-6 ${saved ? "fill-[#2D6A4F] text-[#2D6A4F]" : "text-gray-700 dark:text-gray-200"}`} />
        </button>
      </div>

      {/* Curtidas + comentários (visível a todos) */}
      {(likeCount > 0 || commentCount > 0) && (
        <div className="px-3.5 pt-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {likeCount > 0 && (
            <span>{likeCount} {likeCount === 1 ? "mi piace" : "mi piace"}</span>
          )}
          {likeCount > 0 && commentCount > 0 && <span className="text-gray-300 dark:text-gray-600">·</span>}
          {commentCount > 0 && (
            <button onClick={() => setShowComments(true)}>
              {commentCount} {commentCount === 1 ? "commento" : "commenti"}
            </button>
          )}
        </div>
      )}

      {/* Legenda */}
      {caption && (
        <p className="px-3.5 pt-1 text-sm text-gray-800 dark:text-gray-200 leading-snug whitespace-pre-wrap">
          <span className="font-semibold">{post.author_name || "Gosto Puro"}</span>{" "}
          {linkify(expanded || !longCaption ? caption : caption.slice(0, 140) + "… ")}
          {longCaption && !expanded && (
            <button onClick={() => setExpanded(true)} className="text-gray-400 font-medium">altro</button>
          )}
        </p>
      )}

      {/* Tags de interesse */}
      {tags.length > 0 && (
        <div className="px-3.5 pt-1.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="text-[11px] font-semibold text-[#2D6A4F] bg-[#2D6A4F]/8 px-2 py-0.5 rounded-full">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Botão de vitrine (venda de produto) */}
      {hasCta && (
        <div className="px-3.5 pt-2.5">
          <button
            onClick={() => setShowProduct(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#D4A846] hover:bg-[#c39a3d] text-[#412402] font-bold text-sm py-2.5 rounded-xl transition"
          >
            <ShoppingBag className="w-4 h-4" />
            {post.cta_label}
          </button>
        </div>
      )}

      {/* Comentários */}
      <button
        onClick={() => setShowComments(true)}
        className="px-3.5 pt-1.5 text-sm text-gray-400 block"
      >
        Aggiungi un commento...
      </button>

      {/* Dados do post — visível só p/ autor e admin */}
      {canSeeInsights ? (
        <div className="px-3.5 pt-2 pb-3 flex items-center gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.view_count || 0}</span>
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {likeCount}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {commentCount}</span>
          <span className="flex items-center gap-1"><Bookmark className="w-3.5 h-3.5" /> {post.save_count || 0}</span>
        </div>
      ) : (
        <div className="pb-3" />
      )}

      {showComments && (
        <CommentsSheet
          post={post}
          me={me}
          onClose={() => setShowComments(false)}
          onCountChange={(d) => setCommentCount((c) => Math.max(0, c + d))}
        />
      )}

      {showProfile && (
        <CreatorProfileSheet authorId={post.author_id} me={me} onClose={() => setShowProfile(false)} />
      )}

      {showProduct && <ProductPopup post={post} onClose={() => setShowProduct(false)} />}
    </article>
  );
}
