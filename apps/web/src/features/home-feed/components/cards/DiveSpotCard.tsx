"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";
import {
  FeedCardShell,
  FeedItemHeader,
} from "@/features/home-feed/components/FeedCardShell";
import { DiveSiteLikeButton } from "@/features/explore/components/DiveSiteLikeButton";

type DiveSpotPayload = {
  name?: string;
  slug?: string;
  area?: string;
  description?: string;
  entryDifficulty?: string;
  verificationStatus?: string;
  recentUpdateCount?: number;
  saveCount?: number;
  likeCount?: number;
  viewerHasLiked?: boolean;
};

const verificationLabel = (value?: string) => {
  switch (value) {
    case "verified":
      return "Verified";
    case "moderator":
      return "Checked by team";
    case "instructor":
      return "Instructor noted";
    case "community":
    default:
      return "Community shared";
  }
};

export function DiveSpotCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as DiveSpotPayload;
  const diveSpotActions = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <DiveSiteLikeButton
        siteId={item.entityId}
        likeCount={payload.likeCount ?? 0}
        viewerHasLiked={payload.viewerHasLiked ?? false}
      />
      {actions}
    </div>
  );

  return (
    <FeedCardShell item={item} actions={diveSpotActions}>
      <FeedItemHeader
        item={item}
        displayName={payload.name || "Dive spot"}
        usernameFallback="Dive spot"
        metadata={[payload.area || "Unknown area"]}
        typeExtras={
          <Badge
            variant="outline"
            className="h-6 border-cyan-500/30 bg-cyan-500/10 px-2 text-cyan-800"
          >
            {verificationLabel(payload.verificationStatus)}
          </Badge>
        }
      />
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <p>
          Difficulty:{" "}
          <span className="font-medium text-foreground">
            {payload.entryDifficulty || "n/a"}
          </span>
        </p>
        <p>
          {payload.recentUpdateCount ?? 0} updates · {payload.saveCount ?? 0}{" "}
          saves · {payload.likeCount ?? 0} likes
        </p>
      </div>
      {payload.description ? (
        payload.slug ? (
          <Link
            href={`/explore/sites/${payload.slug}`}
            className="block line-clamp-2 text-sm text-foreground hover:underline"
          >
            {payload.description}
          </Link>
        ) : (
          <p className="line-clamp-2 text-sm text-foreground">
            {payload.description}
          </p>
        )
      ) : null}
    </FeedCardShell>
  );
}
