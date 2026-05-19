"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";
import {
  FeedCardShell,
  FeedItemHeader,
} from "@/features/home-feed/components/FeedCardShell";

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
      <FeedItemHeader
        item={item}
        displayName={payload.authorName || "Diver"}
        username={payload.authorUsername}
        metadata={[
          payload.diveSiteSlug && payload.diveSiteName ? (
            <Link
              href={`/explore/sites/${payload.diveSiteSlug}`}
              className="hover:underline"
            >
              {payload.diveSiteName}
            </Link>
          ) : (
            payload.diveSiteName || "Dive spot"
          ),
          payload.area,
        ]}
        typeExtras={
          payload.savedByViewer ? (
            <Badge variant="outline" className="h-6 px-2">
              Saved spot
            </Badge>
          ) : null
        }
      />
      {item.detailHref ? (
        <Link
          href={item.detailHref}
          className="block line-clamp-3 text-sm leading-relaxed text-foreground hover:underline"
        >
          {payload.note || "No report note"}
        </Link>
      ) : (
        <p className="line-clamp-3 text-sm leading-relaxed">
          {payload.note || "No report note"}
        </p>
      )}
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
