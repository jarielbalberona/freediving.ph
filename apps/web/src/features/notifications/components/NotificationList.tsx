"use client";

import type { NotificationFilters } from "@freediving.ph/types";
import { Bell, CheckCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationCard } from "./NotificationCard";
import { useMarkAllAsRead, useNotifications } from "../hooks";

interface NotificationListProps {
  filters?: NotificationFilters;
}

export function NotificationList({ filters }: NotificationListProps) {
  const { data, isLoading, error } = useNotifications(filters);
  const markAllAsReadMutation = useMarkAllAsRead();

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-2 py-2">
            <Skeleton className="mt-1 size-2 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load notifications. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const notifications = data ?? [];
  const unreadCount = notifications.filter(
    (notification) => notification.status === "UNREAD",
  ).length;

  if (notifications.length === 0) {
    return (
      <div className="py-6 text-center">
        <Bell className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-medium text-foreground">
          No notifications
        </h3>
        <p className="text-xs leading-5 text-muted-foreground">
          You're all caught up! New notifications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Mark read
          </Button>
        </div>
      )}

      <div className="divide-y divide-border/70 border-y border-border/70">
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
}
