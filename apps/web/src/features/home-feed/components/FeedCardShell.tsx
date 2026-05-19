"use client";

import { parseISO } from "date-fns";
import {
  CalendarRange,
  Camera,
  Compass,
  MessageSquareText,
  Radio,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HomeFeedItem } from "@freediving.ph/types";

const typeStyles: Record<
  HomeFeedItem["type"],
  { badge: string; icon: string }
> = {
  post: {
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-800",
    icon: "bg-cyan-500/10 text-cyan-800",
  },
  media_post: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-800",
    icon: "bg-sky-500/10 text-sky-800",
  },
  community_hot_post: {
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-800",
    icon: "bg-teal-500/10 text-teal-800",
  },
  dive_spot: {
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-800",
    icon: "bg-cyan-500/10 text-cyan-800",
  },
  event: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800",
    icon: "bg-amber-500/10 text-amber-800",
  },
  buddy_signal: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
    icon: "bg-emerald-500/10 text-emerald-800",
  },
  record_highlight: {
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-800",
    icon: "bg-violet-500/10 text-violet-800",
  },
};

const typeIcons: Record<HomeFeedItem["type"], LucideIcon> = {
  post: Waves,
  media_post: Camera,
  community_hot_post: MessageSquareText,
  dive_spot: Compass,
  event: CalendarRange,
  buddy_signal: Radio,
  record_highlight: Camera,
};

function formatElapsedTime(value: string) {
  try {
    const timestamp = parseISO(value).getTime();
    if (!Number.isFinite(timestamp)) return "";

    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSeconds < 60) return "now";

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `${diffWeeks}w`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo`;

    return `${Math.floor(diffDays / 365)}y`;
  } catch {
    return "";
  }
}

export function FeedTypeBadge({ item }: { item: HomeFeedItem }) {
  const styles = typeStyles[item.type] ?? typeStyles.dive_spot;
  const Icon = typeIcons[item.type] ?? Compass;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full",
          styles.icon,
        )}
        aria-hidden="true"
      >
        <Icon className="size-3.5" />
      </span>
      <Badge variant="outline" className={cn("h-6 px-2", styles.badge)}>
        {item.typeLabel}
      </Badge>
    </span>
  );
}

export function FeedItemHeader({
  item,
  displayName,
  username,
  avatarUrl,
  showProfileImage = true,
  usernameDisabled = false,
  usernameFallback = "Unknown",
  metadata = [],
  typeExtras,
}: {
  item: HomeFeedItem;
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  showProfileImage?: boolean;
  usernameDisabled?: boolean;
  usernameFallback?: string;
  metadata?: React.ReactNode[];
  typeExtras?: React.ReactNode;
}) {
  const elapsedTime = formatElapsedTime(item.createdAt);

  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <UserIdentityHeader
          displayName={displayName || "Diver"}
          username={username}
          avatarUrl={avatarUrl}
          showProfileImage={showProfileImage}
          usernameDisabled={usernameDisabled}
          usernameFallback={usernameFallback}
          metadata={metadata}
          time={elapsedTime}
          className="min-w-[12rem] flex-1"
        />
        <div className="flex max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          <FeedTypeBadge item={item} />
          {typeExtras}
        </div>
      </div>
    </header>
  );
}

export function FeedCardShell({
  item,
  children,
  actions,
  className,
}: {
  item: HomeFeedItem;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("relative border-b border-border/70 py-4", className)}>
      <div className="space-y-3">
        <div className="space-y-3">{children}</div>
      </div>
      {actions ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </article>
  );
}
