"use client";

import { useState, useEffect } from"react";
import { api } from"~/trpc/react";
import { Bell, X, Calendar, CheckCircle2, AlertCircle, Trash2 } from"lucide-react";
import { formatDistanceToNow } from"date-fns";
import { useRouter } from"next/navigation";

interface Notification {
 id: string;
 type:"event" |"task" |"project" |"system";
 title: string;
 message: string;
 createdAt: Date;
 read: boolean;
 link?: string;
}

export function NotificationSystem() {
 const router = useRouter();
 const [isOpen, setIsOpen] = useState(false);
 const [notifications, setNotifications] = useState<Notification[]>([]);

 const utils = api.useUtils();

 const { data: storedNotifications, refetch } = api.notification.getAll.useQuery(undefined, {
 refetchInterval: 5000, 
 refetchOnWindowFocus: true, 
 refetchOnMount: true,
 });

 const markAsReadMutation = api.notification.markAsRead.useMutation({
 onSuccess: () => {
 void utils.notification.getAll.invalidate();
 void utils.notification.getUnreadCount.invalidate();
 },
 });

 const deleteMutation = api.notification.delete.useMutation({
 onSuccess: () => {
 void utils.notification.getAll.invalidate();
 void utils.notification.getUnreadCount.invalidate();
 },
 });

 const deleteAllMutation = api.notification.deleteAll.useMutation({
 onSuccess: () => {
 setNotifications([]);
 void utils.notification.getAll.invalidate();
 void utils.notification.getUnreadCount.invalidate();
 },
 });

 useEffect(() => {
 if (storedNotifications) {
 const formattedNotifications: Notification[] = storedNotifications.map((notif) => {
 const notifType = notif.type;
 const validType:"event" |"task" |"project" |"system" = 
 (notifType ==="event" || notifType ==="task" || notifType ==="project" || notifType ==="system") 
 ? notifType 
 :"system";
 
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

 useEffect(() => {
 if (isOpen) {
 void refetch();
 }
 }, [isOpen, refetch]);

 const unreadCount = notifications.filter((n) => !n.read).length;

 const handleMarkAsRead = (id: string) => {
 markAsReadMutation.mutate({ notificationId: id });
 };

 const handleDelete = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 deleteMutation.mutate({ notificationId: id });
 };

 const handleClearAll = () => {
 deleteAllMutation.mutate();
 };

 const handleNotificationClick = (notification: Notification) => {
 if (!notification.read) {
 handleMarkAsRead(notification.id);
 }

 if (notification.link) {
 setIsOpen(false);
 router.push(notification.link);
 }
 };

 const getIcon = (type: string) => {
 switch (type) {
 case"event":
 return <Calendar className="text-event-upcoming" size={20} />;
 case"task":
 return <CheckCircle2 className="text-success" size={20} />;
 case"project":
 return <AlertCircle className="text-warning" size={20} />;
 default:
 return <AlertCircle className="text-fg-tertiary" size={20} />;
 }
 };

 return (
 <div className="relative">
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="relative p-2 text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary/60 rounded-lg transition-colors"
 aria-label="Notifications"
 >
 <Bell size={22} />
 {unreadCount > 0 && (
 <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-primary text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
 {unreadCount > 9 ?"9+" : unreadCount}
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
 <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-bg-elevated/95 backdrop-blur-xl rounded-2xl bg-bg-elevated border border-white/[0.06] shadow-2xl z-50 max-h-[600px] overflow-hidden animate-in slide-in-from-top-2 duration-200">
 <div className="p-4 border-b border-border-light/50 flex items-center justify-between sticky top-0 bg-bg-overlay/80 z-10">
 <div>
 <h3 className="text-lg font-bold text-fg-primary">
 Notifications
 </h3>
 {unreadCount > 0 && (
 <p className="text-xs text-fg-tertiary">{unreadCount} unread</p>
 )}
 </div>
 {notifications.length > 0 && (
 <button
 onClick={handleClearAll}
 disabled={deleteAllMutation.isPending}
 className="text-xs text-error/90 hover:text-error transition-colors disabled:opacity-50 flex items-center gap-1"
 >
 <Trash2 size={14} />
 {deleteAllMutation.isPending ?"Clearing..." :"Clear All"}
 </button>
 )}
 </div>

 <div className="overflow-y-auto max-h-[500px]">
 {notifications.length === 0 ? (
 <div className="p-8 text-center">
 <Bell className="mx-auto text-fg-quaternary/60 mb-3" size={48} />
 <p className="text-fg-secondary">No notifications</p>
 <p className="text-xs text-fg-tertiary mt-2">
 You are all caught up!
 </p>
 </div>
 ) : (
 <div className="divide-y divide-border-light/30">
 {notifications.map((notification) => (
 <div
 key={notification.id}
 onClick={() => handleNotificationClick(notification)}
 className={`p-4 hover:bg-bg-secondary/50 transition-all cursor-pointer group ${
 !notification.read ?"bg-accent-primary/5 border-l-2 border-accent-primary" :""
 }`}
 >
 <div className="flex items-start gap-3">
 <div className="flex-shrink-0 w-10 h-10 bg-accent-primary/10 shadow-sm rounded-lg flex items-center justify-center">
 {getIcon(notification.type)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-2">
 <h4 className={`font-semibold text-sm ${
 !notification.read ?"text-fg-primary" :"text-fg-secondary"
 }`}>
 {notification.title}
 {!notification.read && (
 <span className="ml-2 inline-block w-2 h-2 bg-accent-primary rounded-full"></span>
 )}
 </h4>
 <button
 onClick={(e) => handleDelete(notification.id, e)}
 className="flex-shrink-0 p-1 hover:bg-error/10 rounded transition-colors opacity-0 group-hover:opacity-100"
 aria-label="Delete notification"
 >
 <X size={16} className="text-error/90" />
 </button>
 </div>
 <p className="text-sm text-fg-secondary mt-1">
 {notification.message}
 </p>
 <div className="flex items-center justify-between mt-2">
 <p className="text-xs text-fg-tertiary">
 {formatDistanceToNow(notification.createdAt, {
 addSuffix: true,
 })}
 </p>
 {notification.link && (
 <span className="text-xs text-accent-primary font-medium">
 Click to view →
 </span>
 )}
 </div>
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