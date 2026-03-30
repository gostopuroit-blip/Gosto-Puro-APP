import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_ICON = {
  like: "❤️",
  comment: "💬",
  follow: "👤",
  mention: "📣",
  reply: "↩️",
  share: "🔁",
  new_post: "📝",
  system: "🔔",
};

export default function NotificationBell({ currentUser }) {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    load();
  }, [currentUser]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [open]);

  const load = async () => {
    // Notifications are stored with created_by = sender, filter by recipient_email
    const data = await base44.entities.Notification.filter(
      { recipient_email: currentUser.email },
      "-created_date",
      30
    ).catch(() => []);
    setNotifs(data);
  };

  const markAllRead = async () => {
    const unread = notifs.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true, read_at: new Date().toISOString() })));
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="relative p-2 text-gray-600 dark:text-gray-300"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A]">
            <p className="font-bold text-sm text-gray-900 dark:text-white">Notifiche</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#2D6A4F] font-semibold">Segna tutte lette</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nessuna notifica</p>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-[#222] ${!n.is_read ? "bg-[#2D6A4F]/5" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#2A2A2A] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {n.sender_photo ? (
                      <img src={n.sender_photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base">{TYPE_ICON[n.type] || "🔔"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-[#2D6A4F] rounded-full flex-shrink-0 mt-1" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}