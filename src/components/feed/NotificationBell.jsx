import { useState, useEffect, useCallback } from "react";
import { Bell, X, Heart, MessageCircle, UserPlus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  countUnreadNotifications,
  markAllNotificationsRead,
} from "@/api/notifications";

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} g`;
  return `${Math.floor(d / 7)} sett`;
}

const ICON = {
  like: { Icon: Heart, cls: "text-red-500 fill-red-500" },
  comment: { Icon: MessageCircle, cls: "text-[#2D6A4F]" },
  follow: { Icon: UserPlus, cls: "text-[#2D6A4F]" },
  story_reaction: { Icon: Heart, cls: "text-red-500 fill-red-500" },
};

function Avatar({ name, photo }) {
  return photo ? (
    <img src={photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center font-bold flex-shrink-0">
      {(name || "U").charAt(0).toUpperCase()}
    </div>
  );
}

export default function NotificationBell({ me }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(() => {
    if (!me) return;
    countUnreadNotifications().then(setUnread).catch(() => {});
  }, [me]);

  useEffect(() => { refreshCount(); }, [refreshCount]);
  // Atualiza o contador ao voltar pra aba (sem polling agressivo).
  useEffect(() => {
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshCount]);

  const openSheet = async () => {
    setOpen(true);
    setLoading(true);
    const list = await fetchNotifications().catch(() => []);
    setItems(list);
    setLoading(false);
    // Marca todas como lidas ao abrir (zera o badge).
    if (unread > 0) {
      markAllNotificationsRead().catch(() => {});
      setUnread(0);
    }
  };

  const onItem = (n) => {
    setOpen(false);
    if (n.reference_type === "post" && n.reference_id) {
      navigate(`/Feed?post=${n.reference_id}`);
    } else {
      navigate("/Feed");
    }
  };

  if (!me) return null;

  return (
    <>
      <button onClick={openSheet} className="relative p-1.5" aria-label="Notifiche">
        <Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#2A2A2A]">
              <p className="font-bold text-gray-900 dark:text-white">Notifiche</p>
              <button onClick={() => setOpen(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto">
              {loading ? (
                <div className="py-16 text-center text-gray-400 text-sm">Carico…</div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center px-8">
                  <div className="w-14 h-14 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-7 h-7 text-[#2D6A4F]" />
                  </div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">Ancora nessuna notifica</p>
                  <p className="text-sm text-gray-400 mt-1">Qui vedrai mi piace, commenti e nuovi follower.</p>
                </div>
              ) : (
                items.map((n) => {
                  const { Icon, cls } = ICON[n.type] || { Icon: Bell, cls: "text-gray-400" };
                  return (
                    <button
                      key={n.id}
                      onClick={() => onItem(n)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left border-b border-gray-50 dark:border-[#222] ${n.is_read ? "" : "bg-[#2D6A4F]/5"}`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={n.sender_name} photo={n.sender_photo} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-[#1A1A1A] flex items-center justify-center">
                          <Icon className={`w-3.5 h-3.5 ${cls}`} />
                        </span>
                      </div>
                      <p className="flex-1 text-sm text-gray-800 dark:text-gray-100 leading-snug">
                        {n.message}
                        <span className="block text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</span>
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
