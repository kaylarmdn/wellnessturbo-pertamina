import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarHeart,
  Check,
  CheckCheck,
  Gift,
  HelpCircle,
  Sparkles,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  generateAutomatedNotifications,
  getStoredClaims,
  getStoredNotifications,
  listEvents,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/api";
import type { AppNotification, NotificationType } from "@/lib/types";

export function NotificationPopover() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const events = useQuery({ queryKey: ["events"], queryFn: listEvents });

  const loadNotifications = () => {
    const claims = getStoredClaims();
    if (events.data) {
      generateAutomatedNotifications(user, events.data ?? [], claims);
    }
    const notifs = getStoredNotifications(user?.id);
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id, events.data]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(user?.id);
    loadNotifications();
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    loadNotifications();
    setIsOpen(false);

    if (notif.link) {
      navigate({ to: notif.link as never });
    }
  };

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case "event":
        return (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-600 font-bold border border-rose-200">
            ⚠️
          </div>
        );
      case "reward":
        return (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-purple-500/15 text-purple-600 font-bold border border-purple-200">
            🎁
          </div>
        );
      default:
        return (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-600 font-bold border border-indigo-200">
            📢
          </div>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Pusat Notifikasi"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-slate-800"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-md animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-96 rounded-3xl border-purple-100/90 bg-white/95 p-0 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-50 p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-purple-500/15 text-purple-600 font-bold text-xs">
              🔔
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">Pusat Notifikasi</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Event Medical & Klaim Reward
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-7 rounded-full text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 px-2.5"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Tandai Dibaca
            </Button>
          )}
        </div>

        {/* Notifications Scroll List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-purple-50 text-purple-400">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">Belum Ada Notifikasi</p>
              <p className="text-[11px] text-slate-500 font-medium max-w-xs mx-auto">
                Event Medical H-2 dan persetujuan klaim hadiah akan muncul di sini.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-3 p-3 transition-colors cursor-pointer rounded-2xl ${
                  notif.read ? "hover:bg-slate-50 opacity-80" : "bg-purple-50/40 hover:bg-purple-50/70 font-semibold"
                }`}
              >
                {getNotifIcon(notif.type)}

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs leading-snug ${notif.read ? "font-bold text-slate-800" : "font-black text-slate-900 text-indigo-900"}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                    {new Date(notif.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
