"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";

type DiveSpotPayload = {
  name?: string;
  slug?: string;
  area?: string;
  description?: string;
  entryDifficulty?: string;
  verificationStatus?: string;
  recentUpdateCount?: number;
  saveCount?: number;
};

export function DiveSpotCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as DiveSpotPayload;
  return (
    <FeedCardShell item={item} actions={actions}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {payload.slug ? (
            <Link
              href={`/explore/sites/${payload.slug}`}
              className="hover:underline"
            >
              <p className="truncate text-base font-semibold tracking-tight">
                {payload.name || "Dive spot"}
              </p>
            </Link>
          ) : (
            <p className="truncate text-base font-semibold tracking-tight">
              {payload.name || "Dive spot"}
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {payload.area || "Unknown area"}
          </p>
        </div>
        <Badge
          variant="outline"
          className="mt-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        >
          {payload.verificationStatus || "community"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <p>
          Difficulty:{" "}
          <span className="font-medium text-foreground">
            {payload.entryDifficulty || "n/a"}
          </span>
        </p>
        <p>
          {payload.recentUpdateCount ?? 0} updates · {payload.saveCount ?? 0}{" "}
          saves
        </p>
      </div>
      {payload.description ? (
        <p className="line-clamp-2 text-sm text-foreground/80">
          {payload.description}
        </p>
      ) : null}
    </FeedCardShell>
  );
}
