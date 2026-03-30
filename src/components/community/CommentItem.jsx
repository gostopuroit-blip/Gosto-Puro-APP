import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, Trash2, Flag, MessageCircle, BadgeCheck, X } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "../UserAvatar";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Contenuto inappropriato" },
  { value: "hate_speech", label: "Incitamento all'odio" },
  { value: "violence", label: "Violenza" },
  { value: "misinformation", label: "Disinformazione" },
  { value: "other", label: "Altro" },
];

function ReportModal({ comment, currentUser, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) return toast.error("Seleziona un motivo");
    setSending(true);
    await base44.entities.PostReport.create({
      reporter_email: currentUser.email,
      reported_comment_id: comment.id,
      reported_user_email: comment.created_by,
      reason,
      details: details.trim() || undefined,
      status: "pending",
    }).catch(() => {});
    toast.success("Segnalazione inviata. Grazie!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full max-w-lg p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-500" /> Segnala commento
        </h3>
        <div className="space-y-2 mb-4">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                reason === r.value
                  ? "border-red-400 bg-red-50 dark:bg-red-950/20 text-red-600"
                  : "border-gray-100 dark:border-[#2A2A2A] text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Dettagli aggiuntivi (opzionale)..."
          className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white outline-none resize-none h-20 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500">Annulla</button>
          <button onClick={submit} disabled={sending} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
            {sending ? "Invio..." : "Segnala"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommentItem({
  comment,
  currentUser,
  onDelete,
  onReply,
  postAuthorEmail,
}) {
  const [showReport, setShowReport] = useState(false);
  const isLiked = comment.likes?.includes(currentUser?.email);

  const handleLike = async () => {
    if (!currentUser) return toast.error("Fai login per mettere mi piace");
    const likes = comment.likes || [];
    const newLikes = isLiked
      ? likes.filter((e) => e !== currentUser?.email)
      : [...likes, currentUser?.email];
    await base44.entities.CommunityComment.update(comment.id, {
      likes: newLikes,
      likes_count: newLikes.length,
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <UserAvatar photoUrl={comment.user_photo} userName={comment.user_name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              {comment.user_name || "Utente"}
            </p>
            {comment.is_expert && <BadgeCheck className="w-3 h-3 text-[#2D6A4F]" />}
          </div>

          {/* Reply mention */}
          {comment.reply_to_user && (
            <p className="text-xs text-[#2D6A4F] font-medium mt-0.5">
              @{comment.reply_to_user}
            </p>
          )}

          <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={handleLike}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[#2D6A4F] transition"
            >
              <Heart className={`w-3 h-3 transition ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
              {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
            </button>

            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[#2D6A4F] transition"
            >
              <MessageCircle className="w-3 h-3" />
              Rispondi
            </button>

            {/* Report button for non-owners */}
            {currentUser?.email !== comment.created_by && (
              <button
                onClick={() => setShowReport(true)}
                className="text-gray-400 hover:text-red-500 transition ml-auto"
              >
                <Flag className="w-3 h-3" />
              </button>
            )}

            {/* Delete button for owner or admin */}
            {(currentUser?.role === "admin" || comment.created_by === currentUser?.email) && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showReport && currentUser && (
        <ReportModal comment={comment} currentUser={currentUser} onClose={() => setShowReport(false)} />
      )}
    </>
  );
}