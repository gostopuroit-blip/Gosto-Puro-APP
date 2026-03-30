import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  MoreHorizontal, Flag, UserX, Share2, Copy, Facebook,
  Instagram, Music2, Link, Pencil, Trash2, Repeat2, Bookmark
} from "lucide-react";
import { toast } from "sonner";
import RepostModal from "./RepostModal";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Contenuto inappropriato" },
  { value: "hate_speech", label: "Discorso d'odio" },
  { value: "violence", label: "Violenza" },
  { value: "nudity", label: "Nudità" },
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
      <div className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full max-w-lg p-5 pb-8" onClick={(e) => e.stopPropagation()}>
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

export default function PostActionsMenu({ post, currentUser, onPostShared, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!currentUser || !post) return;
    checkIfSaved();
  }, [currentUser?.email, post?.id]);

  const checkIfSaved = async () => {
    try {
      const saved = await base44.entities.SavedPost.filter(
        { post_id: post.id, user_email: currentUser.email },
        "-created_date",
        1
      );
      setIsSaved(saved.length > 0);
    } catch {
      setIsSaved(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [open]);

  const postUrl = `${window.location.origin}/Community`;

  const handleBlock = async () => {
    if (!currentUser || post.created_by === currentUser.email) return;
    await base44.entities.UserBlock.create({
      blocker_email: currentUser.email,
      blocked_email: post.created_by,
    });
    toast.success("Utente bloccato");
    setOpen(false);
  };

  const handleRepostClick = () => {
    if (!currentUser) {
      toast.error("Fai login per ricondividere");
      return;
    }
    if (post.created_by === currentUser.email) {
      toast.error("Non puoi ricondividere il tuo post");
      return;
    }
    setShowRepostModal(true);
    setOpen(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(postUrl).catch(() => {});
    toast.success("Link copiato!");
    setOpen(false);
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, "_blank");
    setOpen(false);
  };

  const shareOnTikTok = () => {
    // TikTok doesn't support direct URL sharing; opens TikTok create page
    window.open("https://www.tiktok.com/upload", "_blank");
    setOpen(false);
  };

  const shareOnInstagram = () => {
    // Instagram doesn't support direct web sharing; opens Instagram
    window.open("https://www.instagram.com/", "_blank");
    setOpen(false);
  };

  const handleSaveClick = async () => {
    if (!currentUser) {
      toast.error("Fai login per salvare i post");
      return;
    }

    if (isSaved) {
      // Remove from saved
      const saved = await base44.entities.SavedPost.filter({
        post_id: post.id,
        user_email: currentUser.email,
      });
      if (saved.length > 0) {
        await base44.entities.SavedPost.delete(saved[0].id);
        setIsSaved(false);
        toast.success("Post rimosso dai salvati");
      }
    } else {
      // Show collection modal
      setShowCollectionModal(true);
    }
    setOpen(false);
  };

  const isOwner = post.created_by === currentUser?.email;
  const isAdmin = currentUser?.role === "admin";

  const MenuItem = ({ icon: Icon, label, onClick, danger = false }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition text-left ${
        danger
          ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111]"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );

  return (
    <>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((v) => !v)} className="p-1 text-gray-400 hover:text-gray-600 transition">
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {open && (
          <div className="absolute right-0 bottom-8 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl shadow-xl z-40 w-52 overflow-hidden">

            {/* Owner actions */}
            {(isOwner || isAdmin) && (
              <>
                {isOwner && onEdit && (
                  <MenuItem icon={Pencil} label="Modifica" onClick={() => { onEdit(post); setOpen(false); }} />
                )}
                <MenuItem icon={Trash2} label="Elimina" onClick={() => { onDelete?.(post); setOpen(false); }} danger />
                <div className="border-t border-gray-100 dark:border-[#2A2A2A]" />
              </>
            )}

            {/* Share actions */}
            {post.created_by !== currentUser?.email && (
              <MenuItem icon={Repeat2} label="🔁 Ricondividi" onClick={handleRepostClick} />
            )}
            <MenuItem
              icon={Bookmark}
              label={isSaved ? "Rimuovi dai salvati" : "Salva post"}
              onClick={handleSaveClick}
            />
            <MenuItem icon={Link} label="Copia link" onClick={copyLink} />
            <MenuItem icon={Facebook} label="Condividi su Facebook" onClick={shareOnFacebook} />
            <MenuItem icon={Music2} label="Condividi su TikTok" onClick={shareOnTikTok} />
            <MenuItem icon={Instagram} label="Condividi su Instagram" onClick={shareOnInstagram} />

            {/* Report / Block — only for non-owners */}
            {!isOwner && currentUser && (
              <>
                <div className="border-t border-gray-100 dark:border-[#2A2A2A]" />
                <MenuItem icon={Flag} label="Segnala" onClick={() => { setShowReport(true); setOpen(false); }} danger />
                <MenuItem icon={UserX} label="Blocca" onClick={handleBlock} danger />
              </>
            )}
          </div>
        )}
      </div>

      {showReport && currentUser && (
        <ReportModal post={post} currentUser={currentUser} onClose={() => setShowReport(false)} />
      )}

      {showRepostModal && currentUser && (
        <RepostModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowRepostModal(false)}
          onReposted={() => onPostShared?.()}
        />
      )}

      {showCollectionModal && currentUser && (
        <SaveToCollectionModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowCollectionModal(false)}
          onSaved={() => {
            setIsSaved(true);
            setShowCollectionModal(false);
          }}
        />
      )}
    </>
  );
}

function SaveToCollectionModal({ post, currentUser, onClose, onSaved }) {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("Salvati");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const saved = await base44.entities.SavedPost.filter(
        { user_email: currentUser.email },
        "-created_date",
        500
      );
      const uniqueCollections = [...new Set(saved.map((s) => s.collection || "Salvati"))];
      setCollections(uniqueCollections);
    } catch {
      setCollections(["Salvati"]);
    }
  };

  const handleSave = async () => {
    if (!selectedCollection && !newCollectionName.trim()) {
      toast.error("Seleziona o crea una collezione");
      return;
    }

    setSaving(true);
    try {
      const collectionName = newCollectionName.trim() || selectedCollection;
      await base44.entities.SavedPost.create({
        post_id: post.id,
        user_email: currentUser.email,
        collection: collectionName,
      });
      toast.success(`Post salvato in "${collectionName}"`);
      onSaved();
    } catch (err) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl w-full max-w-lg p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          🔖 Salva in collezione
        </h3>

        {!isCreatingNew && (
          <>
            <div className="space-y-2 mb-4">
              {collections.map((col) => (
                <button
                  key={col}
                  onClick={() => setSelectedCollection(col)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    selectedCollection === col
                      ? "border-[#2D6A4F] bg-[#2D6A4F]/10 dark:bg-[#2D6A4F]/20 text-[#2D6A4F]"
                      : "border-gray-100 dark:border-[#2A2A2A] text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111]"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full text-center px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#333] text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-[#2D6A4F] transition"
            >
              ➕ Nuova collezione
            </button>
          </>
        )}

        {isCreatingNew && (
          <>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Es: Ricette preferite, Ispirazioni..."
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white outline-none mb-4"
              autoFocus
            />
            <button
              onClick={() => setIsCreatingNew(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← Torna alle collezioni
            </button>
          </>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-semibold text-gray-500 dark:text-gray-400"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!selectedCollection && !newCollectionName.trim())}
            className="flex-1 py-3 rounded-xl bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}