// src/app/_components/notificationSystem.tsx
"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Bell, X, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "event" | "task" | "project" | "system";
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  link?: string;
}

export function NotificationSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch stored notifications from database
  const { data: storedNotifications } = api.notification.getAll.useQuery(undefined, {
    refetchInterval: 60000, // Check every minute
  });

  const markAsReadMutation = api.notification.markAsRead.useMutation();
  const deleteAllMutation = api.notification.deleteAll.useMutation({
    onSuccess: () => {
      setNotifications([]);
    },
  });

  // Update local state when stored notifications change
  useEffect(() => {
    if (storedNotifications) {
      const formattedNotifications: Notification[] = storedNotifications.map((notif) => {
        const notifType = notif.type;
        // Validate the type at runtime
        const validType: "event" | "task" | "project" | "system" = 
          (notifType === "event" || notifType === "task" || notifType === "project" || notifType === "system") 
            ? notifType 
            : "system";
        
        return {
          id: notif.id.toString(),
          type: validType,
          title: notif.title,
          message: notif.message,
          createdAt: new Date(notif.createdAt),
          read: notif.read,
          link: notif.link ?? undefined,
        };
      });
      setNotifications(formattedNotifications);
    }
  }, [storedNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    markAsReadMutation.mutate({ notificationId: id });
  };

  const handleClearAll = () => {
    deleteAllMutation.mutate();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "event":
        return <Calendar className="text-[#A343EC]" size={20} />;
      case "task":
        return <CheckCircle2 className="text-[#A343EC]" size={20} />;
      case "project":
        return <AlertCircle className="text-[#A343EC]" size={20} />;
      default:
        return <AlertCircle className="text-[#A343EC]" size={20} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#E4DEAA] hover:text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#A343EC] text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-96 bg-[#1a2128] rounded-2xl border border-white/10 shadow-2xl z-50 max-h-[600px] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#FBF9F5]">
                Notifications
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={deleteAllMutation.isPending}
                  className="text-xs text-[#E4DEAA] hover:text-[#FBF9F5] transition-colors disabled:opacity-50"
                >
                  {deleteAllMutation.isPending ? "Clearing..." : "Clear All"}
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[500px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto text-[#E4DEAA]/30 mb-3" size={48} />
                  <p className="text-[#E4DEAA]">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-white/5 transition-colors ${
                        !notification.read ? "bg-[#A343EC]/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-[#FBF9F5] text-sm">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                                aria-label="Mark as read"
                              >
                                <X size={16} className="text-[#E4DEAA]" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-[#E4DEAA] mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-[#E4DEAA]/60 mt-2">
                            {formatDistanceToNow(notification.createdAt, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}