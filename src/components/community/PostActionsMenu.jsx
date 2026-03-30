import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MoreHorizontal, Flag, UserX, Share2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Contenuto inappropriato" },
  { value: "hate_speech", label: "Incitamento all'odio" },
  { value: "violence", label: "Violenza" },
  { value: "misinformation", label: "Disinformazione" },
  { value: "other", label: "Altro" },
];

function ReportModal({ post, currentUser, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) return toast.error("Seleziona un motivo");
    setSending(true);
    await base44.entities.PostReport.create({
      reporter_email: currentUser.email,
      reported_post_id: post.id,
      reported_user_email: post.created_by,
      reason,
      details: details.trim() || undefined,
      status: "pending",
    });
    toast.success("Segnalazione inviata. Grazie!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-500" /> Segnala post
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

export default function PostActionsMenu({ post, currentUser, onPostShared }) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [open]);

  const handleBlock = async () => {
    if (!currentUser || post.created_by === currentUser.email) return;
    await base44.entities.UserBlock.create({
      blocker_email: currentUser.email,
      blocked_email: post.created_by,
    });
    toast.success("Utente bloccato");
    setOpen(false);
  };

  const handleRepost = async () => {
    if (!currentUser) return;
    await base44.entities.PostShare.create({
      sharer_email: currentUser.email,
      original_post_id: post.id,
      share_type: "repost",
    });
    // Notify original author
    if (post.created_by && post.created_by !== currentUser.email) {
      await base44.entities.Notification.create({
        recipient_email: post.created_by,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email.split("@")[0],
        sender_photo: currentUser.photo_url || null,
        type: "share",
        message: `${currentUser.full_name || currentUser.email.split("@")[0]} ha ricondiviso il tuo post`,
        reference_id: post.id,
        reference_type: "post",
        is_read: false,
      }).catch(() => {});
    }
    toast.success("Post ricondiviso!");
    onPostShared?.();
    setOpen(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/Community").catch(() => {});
    toast.success("Link copiato!");
    setOpen(false);
  };

  const isOwner = post.created_by === currentUser?.email;

  return (
    <>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((v) => !v)} className="p-1 text-gray-400 hover:text-gray-600 transition">
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {open && (
          <div className="absolute right-0 top-8 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl shadow-xl z-40 w-48 overflow-hidden">
            <button onClick={handleRepost} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111] transition text-left">
              <Share2 className="w-4 h-4" /> Ricondividi
            </button>
            <button onClick={copyLink} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111] transition text-left">
              <Copy className="w-4 h-4" /> Copia link
            </button>
            {!isOwner && currentUser && (
              <>
                <div className="border-t border-gray-100 dark:border-[#2A2A2A]" />
                <button onClick={() => { setShowReport(true); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition text-left">
                  <Flag className="w-4 h-4" /> Segnala
                </button>
                <button onClick={handleBlock} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition text-left">
                  <UserX className="w-4 h-4" /> Blocca utente
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showReport && currentUser && (
        <ReportModal post={post} currentUser={currentUser} onClose={() => setShowReport(false)} />
      )}
    </>
  );
}