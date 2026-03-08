"use client";

import { Bookmark, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HomeFeedItem } from "@freediving.ph/types";

import { BuddySignalCard } from "@/features/home-feed/components/cards/BuddySignalCard";
import { CommunityHotCard } from "@/features/home-feed/components/cards/CommunityHotCard";
import { DiveSpotCard } from "@/features/home-feed/components/cards/DiveSpotCard";
import { EventCard } from "@/features/home-feed/components/cards/EventCard";
import { MediaPostCard } from "@/features/home-feed/components/cards/MediaPostCard";
import { PostFeedCard } from "@/features/home-feed/components/cards/PostFeedCard";
import { RecordHighlightCard } from "@/features/home-feed/components/cards/RecordHighlightCard";

export function FeedItemRenderer({
  item,
  position,
  onAction,
}: {
  item: HomeFeedItem;
  position: number;
  onAction: (item: HomeFeedItem, actionType: string) => void;
}) {
  const actions = (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onAction(item, "save_item")}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <Bookmark className="h-4 w-4" />
        <span className="sr-only">Save</span>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onAction(item, "not_interested")}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <EyeOff className="h-4 w-4" />
        <span className="sr-only">Not interested</span>
      </Button>
    </div>
  );

  return (
    <div
      data-feed-item-id={item.id}
      data-entity-id={item.entityId}
      data-entity-type={item.type}
      data-position={position}
      className="space-y-2"
    >
      {item.type === "post" ? (
        <PostFeedCard item={item} actions={actions} />
      ) : null}
      {item.type === "media_post" ? (
        <MediaPostCard item={item} actions={actions} />
      ) : null}
      {item.type === "community_hot_post" ? (
        <CommunityHotCard item={item} actions={actions} />
      ) : null}
      {item.type === "dive_spot" ? (
        <DiveSpotCard item={item} actions={actions} />
      ) : null}
      {item.type === "event" ? (
        <EventCard item={item} actions={actions} />
      ) : null}
      {item.type === "buddy_signal" ? (
        <BuddySignalCard item={item} actions={actions} />
      ) : null}
      {item.type === "record_highlight" ? (
        <RecordHighlightCard item={item} actions={actions} />
      ) : null}
    </div>
  );
}
