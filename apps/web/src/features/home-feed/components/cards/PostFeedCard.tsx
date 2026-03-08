"use client";

import Link from "next/link";

import { UsernameLink } from "@/components/common/UsernameLink";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { HomeFeedItem } from "@freediving.ph/types";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";

type PostPayload = {
  authorName?: string;
  authorUsername?: string;
  diveSiteSlug?: string;
  diveSiteName?: string;
  area?: string;
  note?: string;
  current?: string;
  waves?: string;
  savedByViewer?: boolean;
};

export function PostFeedCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as PostPayload;
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
              {payload.diveSiteSlug && payload.diveSiteName ? (
                <Link
                  href={`/explore/sites/${payload.diveSiteSlug}`}
                  className="truncate hover:underline"
                >
                  {payload.diveSiteName}
                </Link>
              ) : (
                <span>{payload.diveSiteName || "Dive spot"}</span>
              )}
              {payload.area ? <span>{payload.area}</span> : null}
            </div>
          </div>
        </div>
        {payload.savedByViewer ? (
          <Badge variant="outline">Saved spot</Badge>
        ) : null}
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed">
        {payload.note || "No report note"}
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        {payload.current ? (
          <Badge variant="outline">Current: {payload.current}</Badge>
        ) : null}
        {payload.waves ? (
          <Badge variant="outline">Waves: {payload.waves}</Badge>
        ) : null}
      </div>
    </FeedCardShell>
  );
}
