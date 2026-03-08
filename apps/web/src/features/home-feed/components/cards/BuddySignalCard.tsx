"use client";

import Link from "next/link";

import { UsernameLink } from "@/components/common/UsernameLink";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { HomeFeedItem } from "@freediving.ph/types";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";

type BuddyPayload = {
  authorName?: string;
  authorUsername?: string;
  area?: string;
  intentType?: string;
  timeWindow?: string;
  note?: string;
  diveSiteName?: string;
  diveSiteId?: string;
};

export function BuddySignalCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as BuddyPayload;
  return (
    <FeedCardShell item={item} actions={actions}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar displayName={payload.authorName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {payload.authorName || "Diver"}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <UsernameLink
                username={payload.authorUsername}
                className="truncate text-xs text-muted-foreground"
              />
              {payload.area ? <span>{payload.area}</span> : null}
              {payload.diveSiteName && item.detailHref ? (
                <Link
                  href={item.detailHref}
                  className="truncate hover:underline"
                >
                  {payload.diveSiteName}
                </Link>
              ) : payload.diveSiteName ? (
                <span>{payload.diveSiteName}</span>
              ) : null}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          {payload.timeWindow || "time flexible"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{payload.intentType || "fun_dive"}</Badge>
        <Badge variant="outline">Buddy coordination</Badge>
      </div>
      {payload.note ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">
          {payload.note}
        </p>
      ) : null}
    </FeedCardShell>
  );
}
