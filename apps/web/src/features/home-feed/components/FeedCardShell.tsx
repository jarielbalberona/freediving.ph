"use client";

import { formatDistanceToNowStrict, parseISO } from "date-fns";
import {
  CalendarRange,
  Camera,
  Compass,
  MessageSquareText,
  Radio,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HomeFeedItem } from "@freediving.ph/types";

const typeStyles: Record<
  HomeFeedItem["type"],
  { accent: string; badge: string; icon: string }
> = {
  post: {
    accent: "bg-cyan-500/70",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-800",
    icon: "bg-cyan-500/10 text-cyan-800",
  },
  media_post: {
    accent: "bg-sky-500/70",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-800",
    icon: "bg-sky-500/10 text-sky-800",
  },
  community_hot_post: {
    accent: "bg-teal-500/70",
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-800",
    icon: "bg-teal-500/10 text-teal-800",
  },
  dive_spot: {
    accent: "bg-cyan-500/70",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-800",
    icon: "bg-cyan-500/10 text-cyan-800",
  },
  event: {
    accent: "bg-amber-500/70",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800",
    icon: "bg-amber-500/10 text-amber-800",
  },
  buddy_signal: {
    accent: "bg-emerald-500/70",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
    icon: "bg-emerald-500/10 text-emerald-800",
  },
  record_highlight: {
    accent: "bg-violet-500/70",
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

function formatRelativeTime(value: string) {
  try {
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
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
  const styles = typeStyles[item.type] ?? typeStyles.dive_spot;
  const relativeTime = formatRelativeTime(item.createdAt);

  return (
    <article className={cn("relative border-b border-border/70 py-5", className)}>
      <span
        className={cn("absolute left-0 top-5 h-9 w-1 rounded-full", styles.accent)}
        aria-hidden="true"
      />
      <div className="space-y-3 pl-4">
        <div className="flex items-center justify-between gap-3">
          <FeedTypeBadge item={item} />
          {relativeTime ? (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {relativeTime}
            </span>
          ) : null}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
      {actions ? (
        <div className="mt-3 flex items-center justify-end gap-2 pl-4">
          {actions}
        </div>
      ) : null}
    </article>
  );
}
