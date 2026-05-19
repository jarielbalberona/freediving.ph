"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";
import {
  FeedCardShell,
  FeedItemHeader,
} from "@/features/home-feed/components/FeedCardShell";

type EventPayload = {
  title?: string;
  memberCount?: number;
  viewerMember?: boolean;
};

export function EventCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as EventPayload;
  return (
    <FeedCardShell item={item} actions={actions}>
      <FeedItemHeader
        item={item}
        displayName="Community event"
        usernameFallback="Community"
        metadata={[`${payload.memberCount ?? 0} members`]}
        typeExtras={
          <Badge
            variant="outline"
            className="h-6 border-amber-500/30 bg-amber-500/10 px-2 text-amber-800"
          >
            Group session
          </Badge>
        }
      />
      {item.detailHref ? (
        <Link
          href={item.detailHref}
          className="block line-clamp-2 text-base font-semibold tracking-tight text-foreground hover:underline"
        >
          {payload.title || "Untitled event"}
        </Link>
      ) : (
        <p className="line-clamp-2 text-base font-semibold tracking-tight">
          {payload.title || "Untitled event"}
        </p>
      )}
      {payload.viewerMember ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          You are attending
        </p>
      ) : null}
    </FeedCardShell>
  );
}
