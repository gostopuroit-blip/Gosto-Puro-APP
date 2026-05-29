import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

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
    const data = await base44.entities.Notification.filter(
      { recipient_email: currentUser.email },
      "-created_date",
      50
    ).catch(() => []);
    setNotifs(data);
  };

  // Subscribe to new notifications in real-time
  useEffect(() => {
    if (!currentUser) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.recipient_email === currentUser.email) {
        setNotifs((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setNotifs((prev) => prev.map((n) => (n.id === event.id ? event.data : n)));
      } else if (event.type === "delete") {
        setNotifs((prev) => prev.filter((n) => n.id !== event.id));
      }
    });
    return unsub;
  }, [currentUser]);

  const markAllRead = async () => {
    const unread = notifs.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true, read_at: new Date().toISOString() })));
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await base44.entities.Notification.update(notification.id, {
        is_read: true,
        read_at: new Date().toISOString(),
      }).catch(() => {});
    }
    setOpen(false);
  };

  const getNotificationLink = (notification) => {
    if (notification.sender_email && (notification.reference_type === "post" || notification.reference_type === "profile")) {
      return `/ExpertProfile?uid=${btoa(notification.sender_email)}`;
    }
    return null;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-[56px] sm:absolute sm:left-auto sm:right-0 sm:top-10 sm:w-96 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2A2A2A]">
            <p className="font-bold text-sm text-gray-900 dark:text-white">Notifiche</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#2D6A4F] font-semibold hover:text-[#235c43] flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3 h-3" />
                Segna tutto letto
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nessuna notifica</p>
            ) : (
              notifs.map((n) => {
                const link = getNotificationLink(n);
                const NotifComponent = (
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#111] transition text-left ${
                      !n.is_read ? "bg-[#2D6A4F]/8" : ""
                    }`}
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
                    {!n.is_read && <div className="w-2 h-2 bg-[#2D6A4F] rounded-full flex-shrink-0 mt-1.5" />}
                  </button>
                );

                return link ? (
                  <Link key={n.id} to={link}>
                    {NotifComponent}
                  </Link>
                ) : (
                  <div key={n.id}>{NotifComponent}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}