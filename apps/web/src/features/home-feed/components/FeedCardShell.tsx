"use client";

import { formatDistanceToNowStrict, parseISO } from "date-fns";
import Link from "next/link";
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
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HomeFeedItem, HomeFeedItemTone } from "@freediving.ph/types";

const toneStyles: Record<HomeFeedItemTone, { frame: string; badge: string }> = {
  social: {
    frame: "border-l-4 border-l-sky-500/70",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  coordination: {
    frame: "border-l-4 border-l-emerald-500/70",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  conditions: {
    frame: "border-l-4 border-l-amber-500/70",
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  discovery: {
    frame: "border-l-4 border-l-violet-500/70",
    badge:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  milestone: {
    frame: "border-l-4 border-l-rose-500/70",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
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

const detailLabels: Record<HomeFeedItem["type"], string> = {
  post: "View spot",
  media_post: "Open profile",
  community_hot_post: "Open thread",
  dive_spot: "View spot",
  event: "View event",
  buddy_signal: "Open listing",
  record_highlight: "View details",
};

function formatRelativeTime(value: string) {
  try {
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
  } catch {
    return "";
  }
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
  const tone = toneStyles[item.tone] ?? toneStyles.discovery;
  const relativeTime = formatRelativeTime(item.createdAt);
  const Icon = typeIcons[item.type] ?? Compass;

  return (
    <Card className={cn("gap-4 p-5", tone.frame, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <Badge variant="outline" className={tone.badge}>
              {item.typeLabel}
            </Badge>
            <Badge
              variant="outline"
              className="border-border/60 bg-background text-muted-foreground"
            >
              {item.rankLabel}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {item.typeHint}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.rankHint}
            </p>
          </div>
        </div>
        {relativeTime ? (
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {relativeTime}
          </span>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
      {actions || item.detailHref ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
          {item.detailHref ? (
            <Link
              href={item.detailHref}
              className={cn(buttonVariants({ size: "sm" }), "h-8")}
            >
              {detailLabels[item.type] ?? "View details"}
            </Link>
          ) : (
            <span />
          )}
          {actions}
        </div>
      ) : null}
    </Card>
  );
}
