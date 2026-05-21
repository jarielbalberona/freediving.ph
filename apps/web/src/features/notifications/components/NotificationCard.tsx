"use client";

import type { Notification } from "@freediving.ph/types";
import { CheckCircle, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDeleteNotification, useMarkAsRead } from "../hooks";

interface NotificationCardProps {
  notification: Notification;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "URGENT":
        return "destructive";
      case "HIGH":
        return "destructive";
      case "LOW":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleMarkAsRead = () => {
    if (notification.status === "UNREAD") {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleDelete = () => {
    deleteNotificationMutation.mutate(notification.id);
  };

  return (
    <article className="flex gap-2 py-3 text-sm">
      <span
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          notification.status === "UNREAD"
            ? "bg-primary"
            : "bg-muted-foreground/35",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium leading-5 text-foreground">
            {notification.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(notification.createdAt).toLocaleDateString()}
          </div>
        </div>

        <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
          {notification.message}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={getPriorityColor(notification.priority)}
            className="h-5 px-2 text-[11px] font-normal"
          >
            {formatLabel(notification.priority)}
          </Badge>
          <Badge
            variant="outline"
            className="h-5 min-w-0 max-w-full shrink truncate px-2 text-[11px] font-normal text-muted-foreground"
          >
            {formatNotificationType(notification.type)}
          </Badge>
          {notification.readAt ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              Read {new Date(notification.readAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {notification.status === "UNREAD" ? (
            <Button
              size="xs"
              variant="outline"
              onClick={handleMarkAsRead}
              disabled={markAsReadMutation.isPending}
            >
              Mark read
            </Button>
          ) : null}
          <Button
            size="xs"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteNotificationMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function formatNotificationType(value: Notification["type"]) {
  return value
    .replace(/^NEW_/, "")
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function formatLabel(value: string) {
  return value.toLowerCase().replace(/^\w/, (match) => match.toUpperCase());
}
