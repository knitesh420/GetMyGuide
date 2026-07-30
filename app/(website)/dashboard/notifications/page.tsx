"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/redux/thunks/notification/notificationThunks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing } from "lucide-react";

export default function NotificationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, loading } = useSelector(
    (state: RootState) => state.notifications,
  );

  useEffect(() => {
    dispatch(fetchMyNotifications({ page: 1, limit: 50 }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assignments, trips, payments, and membership updates.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => dispatch(markAllNotificationsRead())}
        >
          Mark all as read
        </Button>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <BellRing className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            You&apos;re all caught up
          </p>
          <p className="text-sm text-slate-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              className={
                notification.isRead
                  ? "border-slate-200"
                  : "border-primary/50 bg-primary/5"
              }
            >
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {notification.title}
                    </p>
                    {!notification.isRead && <Badge>New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() =>
                      dispatch(markNotificationRead(notification._id))
                    }
                  >
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
