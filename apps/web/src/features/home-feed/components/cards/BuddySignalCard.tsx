"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";
import {
  FeedCardShell,
  FeedItemHeader,
} from "@/features/home-feed/components/FeedCardShell";

type BuddyPayload = {
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
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
      <FeedItemHeader
        item={item}
        displayName={payload.authorName || "Diver"}
        username={payload.authorUsername}
        avatarUrl={payload.authorAvatarUrl}
        usernameFallback="Pseudonymous"
        metadata={[
          payload.area,
          payload.diveSiteName && item.detailHref ? (
            <Link href={item.detailHref} className="hover:underline">
              {payload.diveSiteName}
            </Link>
          ) : (
            payload.diveSiteName
          ),
          payload.timeWindow,
        ]}
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{payload.intentType || "fun_dive"}</Badge>
        {payload.area ? <Badge variant="outline">{payload.area}</Badge> : null}
      </div>
      {payload.note ? (
        item.detailHref ? (
          <Link
            href={item.detailHref}
            className="block line-clamp-3 text-sm leading-relaxed text-foreground hover:underline"
          >
            {payload.note}
          </Link>
        ) : (
          <p className="line-clamp-3 text-sm leading-relaxed text-foreground">
            {payload.note}
          </p>
        )
      ) : null}
    </FeedCardShell>
  );
}
