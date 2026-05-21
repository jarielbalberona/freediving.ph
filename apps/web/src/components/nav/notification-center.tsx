"use client";

import { Bell, X } from "lucide-react";

import { useSession } from "@/features/auth/session/use-session";
import { useNotificationStats } from "@/features/notifications/hooks/queries";
import { NotificationList } from "@/features/notifications/components/NotificationList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
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
            className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full border-sky-500/30 bg-sky-500 px-1 text-[10px] leading-none text-white shadow-sm shadow-sky-500/20"
          >
            {formatBadge(unreadCount)}
          </Badge>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="data-[side=right]:w-[calc(100vw-0.75rem)] data-[side=right]:sm:w-[22rem] data-[side=right]:sm:max-w-[22rem] p-0"
      >
        <SheetClose
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              className="absolute top-3 right-3"
              aria-label="Close notifications"
            />
          }
        >
          <X className="size-3.5" />
          <span className="sr-only">Close notifications</span>
        </SheetClose>
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="text-base">Notifications</SheetTitle>
          <SheetDescription className="text-xs leading-5">
            Updates from messages and community activity.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-3 py-3">
          <NotificationList />
        </div>
      </SheetContent>
    </Sheet>
  );
}
