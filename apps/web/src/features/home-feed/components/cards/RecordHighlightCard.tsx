"use client";

import type { HomeFeedItem } from "@freediving.ph/types";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";

export function RecordHighlightCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  return (
    <FeedCardShell item={item} actions={actions}>
      <p className="text-base font-semibold text-primary">Record highlight</p>
      <p className="text-sm text-muted-foreground">Entity #{item.entityId}</p>
    </FeedCardShell>
  );
}
