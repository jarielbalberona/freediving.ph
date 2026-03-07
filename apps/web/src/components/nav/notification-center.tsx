"use client";

import { Bell } from "lucide-react";

import { useSession } from "@/features/auth/session/use-session";
import { useNotificationStats } from "@/features/notifications/hooks/queries";
import { NotificationList } from "@/features/notifications/components/NotificationList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const formatBadge = (count: number) => {
  if (count > 99) return "99+";
  return String(count);
};

export function NotificationCenter() {
  const session = useSession();
  const enabled = session.status === "signed_in";
  const statsQuery = useNotificationStats();
  const unreadCount = enabled ? (statsQuery.data?.unread ?? 0) : 0;

  if (!enabled) return null;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            className="relative"
            aria-label="Open notifications"
            tooltip="Open notifications"
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
          >
            {formatBadge(unreadCount)}
          </Badge>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-sm p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Realtime updates for messages and community activity.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto p-4">
          <NotificationList />
        </div>
      </SheetContent>
    </Sheet>
  );
}
