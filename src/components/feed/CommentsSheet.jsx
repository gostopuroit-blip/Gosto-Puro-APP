import { useState, useEffect } from "react";
import { X, Send, Loader2, Trash2, BadgeCheck, Heart, Flag } from "lucide-react";
import { fetchComments, addComment, deleteComment, toggleCommentLike } from "@/api/feed";
import { reportContent } from "@/api/moderation";
import { toast } from "sonner";

function Avatar({ name, photo, size = 32 }) {
  const letter = (name || "U").charAt(0).toUpperCase();
  return photo ? (
    <img src={photo} alt="" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center font-bold flex-shrink-0 text-sm"
    >
      {letter}
    </div>
  );
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ora";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}g`;
}

function CommentRow({ c, me, isReply, onLike, onReply, onDelete, onReport }) {
  const mine = c.user_id === me?.id;
  const canModerate = me?.role === "admin" || me?.is_expert === true;
  return (
    <div className={`flex gap-2.5 ${isReply ? "ml-10" : ""} ${c.author_liked ? "bg-[#2D6A4F]/5 -mx-2 px-2 py-1.5 rounded-xl" : ""}`}>
      <Avatar name={c.author_name} photo={c.author_photo} size={isReply ? 26 : 32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
          <span className="font-semibold">{c.author_name || "Utente"}</span> {c.body}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
          <span>{timeAgo(c.created_at)}</span>
          {c.like_count > 0 && <span>{c.like_count} mi piace</span>}
          <button onClick={onReply} className="font-semibold text-gray-500">Rispondi</button>
          {!mine && (
            <button onClick={onReport} className="text-gray-400 hover:text-gray-600" aria-label="Segnala">
              <Flag className="w-3 h-3" />
            </button>
          )}
          {c.author_liked && (
            <span className="flex items-center gap-1 text-[#2D6A4F] font-semibold">
              <Heart className="w-3 h-3 fill-[#2D6A4F]" /> Piace all'autore
            </span>
          )}
          {(mine || canModerate) && (
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <button onClick={onLike} className="pt-1 active:scale-90 transition">
        <Heart className={`w-4 h-4 ${c.liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
      </button>
    </div>
  );
}

export default function CommentsSheet({ post, me, onClose, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, name }

  useEffect(() => {
    let alive = true;
    fetchComments(post.id)
      .then((c) => alive && setComments(c))
      .catch(() => alive && setComments([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [post.id]);

  const isAuthor = me?.id === post.author_id;

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const c = await addComment(post.id, body, me, replyTo?.id || null);
      setComments((prev) => [...prev, c]);
      setText("");
      setReplyTo(null);
      onCountChange?.(1);
    } catch {
      // silencioso
    } finally {
      setSending(false);
    }
  };

  const like = async (c) => {
    const next = !c.liked;
    setComments((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              liked: next,
              like_count: Math.max(0, (x.like_count || 0) + (next ? 1 : -1)),
              author_liked: isAuthor ? next : x.author_liked,
            }
          : x
      )
    );
    try {
      await toggleCommentLike(c.id, c.liked);
    } catch {
      setComments((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? { ...x, liked: c.liked, like_count: c.like_count, author_liked: c.author_liked }
            : x
        )
      );
    }
  };

  const report = async (c) => {
    if (!window.confirm("Segnalare questo commento agli amministratori?")) return;
    try {
      await reportContent({ type: "comment", id: c.id, authorId: c.user_id, snapshot: c.body });
      toast.success("Segnalazione inviata. Grazie!");
    } catch {
      toast.error("Errore nell'invio");
    }
  };

  const remove = async (c) => {
    if (!window.confirm("Eliminare questo commento?")) return;
    const replyCount = comments.filter((x) => x.parent_id === c.id).length;
    try {
      await deleteComment(c.id);
      setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
      onCountChange?.(-(1 + (c.parent_id ? 0 : replyCount)));
    } catch {
      // silencioso
    }
  };

  const tops = comments
    .filter((c) => !c.parent_id)
    .sort(
      (a, b) =>
        (b.author_liked ? 1 : 0) - (a.author_liked ? 1 : 0) ||
        new Date(a.created_at) - new Date(b.created_at)
    );
  const repliesOf = (id) =>
    comments.filter((c) => c.parent_id === id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-[#1A1A1A] rounded-t-3xl flex flex-col max-h-[85vh] h-[70vh]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#333]">
          <span className="w-8" />
          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Commenti</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" /></div>
          ) : tops.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Ancora nessun commento. Scrivi il primo!</p>
          ) : (
            tops.map((c) => (
              <div key={c.id} className="space-y-3">
                <CommentRow
                  c={c}
                  me={me}
                  isReply={false}
                  onLike={() => like(c)}
                  onReply={() => setReplyTo({ id: c.id, name: c.author_name || "Utente" })}
                  onDelete={() => remove(c)}
                  onReport={() => report(c)}
                />
                {repliesOf(c.id).map((r) => (
                  <CommentRow
                    key={r.id}
                    c={r}
                    me={me}
                    isReply
                    onLike={() => like(r)}
                    onReply={() => setReplyTo({ id: c.id, name: r.author_name || "Utente" })}
                    onDelete={() => remove(r)}
                    onReport={() => report(r)}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {replyTo && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 dark:bg-[#0F0F0F] text-xs text-gray-500">
            <span>Rispondi a <b>{replyTo.name}</b></span>
            <button onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-[#333] p-3 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
          <Avatar name={me?.display_name} photo={me?.photo_url} size={30} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={replyTo ? `Rispondi a ${replyTo.name}...` : "Aggiungi un commento..."}
            className="flex-1 bg-gray-100 dark:bg-[#0F0F0F] rounded-full px-4 py-2.5 text-sm outline-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export { Avatar, timeAgo, BadgeCheck };
