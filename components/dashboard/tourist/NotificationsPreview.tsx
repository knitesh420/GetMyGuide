"use client";

import { Bell, BellRing } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/redux/thunks/notification/notificationThunks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { EmptyState } from "./EmptyState";
import { formatRelative } from "./format";
import { ROW_DIVIDER, ROW_PADDING } from "./ui";
import { cn } from "@/lib/utils";

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const unread = !notification.isRead;

  return (
    <li
      className={cn(
        "flex items-start justify-between gap-3 transition-colors",
        ROW_PADDING,
        unread ? "bg-teal-50/70" : "hover:bg-slate-50",
      )}
    >
      {/* The unread marker is a colour cue, so it carries a text equivalent for
          anyone who can't see it. */}
      <span
        aria-hidden="true"
        className={cn(
          "mt-2 h-2 w-2 shrink-0 rounded-full",
          unread ? "bg-teal-500" : "bg-transparent",
        )}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm leading-tight font-semibold text-slate-900">
            {notification.title}
          </p>
          {unread && (
            <Badge variant="pending" className="px-1.5 py-0 text-[10px]">
              New
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
          {notification.message}
        </p>
        <time
          dateTime={notification.createdAt}
          className="block text-xs text-slate-400"
        >
          {formatRelative(notification.createdAt)}
        </time>
      </div>

      {unread && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium text-teal-700 hover:bg-teal-500/10 hover:text-teal-800"
          onClick={() => onMarkRead(notification._id)}
        >
          Mark read
          <span className="sr-only">: {notification.title}</span>
        </Button>
      )}
    </li>
  );
}

export function NotificationsPreview({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const dispatch = useAppDispatch();

  return (
    <SectionCard
      icon={Bell}
      title="Notifications"
      description={
        unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"
      }
      viewAll={{ label: "View All", href: "/dashboard/notifications" }}
      action={
        unreadCount > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => dispatch(markAllNotificationsRead())}
          >
            Mark all read
          </Button>
        ) : null
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No notifications"
          description="Updates about your bookings, guides and trips will show up here."
        />
      ) : (
        <ul className={ROW_DIVIDER}>
          {notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              onMarkRead={(id) => dispatch(markNotificationRead(id))}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
