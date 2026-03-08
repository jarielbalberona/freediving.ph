"use client";

import { useMemo } from "react";
import Link from "next/link";
import InfiniteScroll from "react-infinite-scroll-component";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FeedItemRenderer } from "@/features/home-feed/components/FeedItemRenderer";
import { useFeedActionMutation } from "@/features/home-feed/hooks/mutations/useFeedActionMutation";
import { useFeedImpressionTracker } from "@/features/home-feed/hooks/useFeedImpressionTracker";
import type { HomeFeedItem, HomeFeedMode } from "@freediving.ph/types";

export function MixedFeed({
  mode,
  items,
  loading,
  hasMore,
  onLoadMore,
  showLoginToSeeMore,
}: {
  mode: HomeFeedMode;
  items: HomeFeedItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  showLoginToSeeMore: boolean;
}) {
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "session-server";
    const existing = window.sessionStorage.getItem("home-feed-session-id");
    if (existing) return existing;
    const created = `hf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem("home-feed-session-id", created);
    return created;
  }, []);

  const actionMutation = useFeedActionMutation();

  useFeedImpressionTracker({
    sessionId,
    mode,
    items,
  });

  const onAction = (item: HomeFeedItem, actionType: string) => {
    actionMutation.mutate({
      sessionId,
      mode,
      items: [
        {
          feedItemId: item.id,
          entityType: item.type,
          entityId: item.entityId,
          actionType,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  if (items.length === 0 && loading) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold">Loading feed...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pulling the latest dives, buddy calls, and local activity.
        </p>
      </Card>
    );
  }

  if (items.length === 0 && !loading) {
    const emptyCopy: Record<HomeFeedMode, { title: string; body: string }> = {
      following: {
        title: "This lane needs people, not filler",
        body: "Follow divers, post an update, or join a conversation so Following becomes a real social feed.",
      },
      nearby: {
        title: "Nothing actionable nearby yet",
        body: "Local buddy calls and fresh site activity will show here once the area has live movement.",
      },
      training: {
        title: "Training is quiet right now",
        body: "Log a session or share progress so this lane becomes useful instead of empty motivation wallpaper.",
      },
      "spot-reports": {
        title: "No fresh spot intel yet",
        body: "Spot reports only matter when they help a real decision. Add one when conditions change.",
      },
    };
    const copy = emptyCopy[mode];

    return (
      <Card className="p-5">
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <InfiniteScroll
        dataLength={items.length}
        next={onLoadMore}
        hasMore={hasMore}
        loader={
          items.length > 0 ? (
            <div className="flex justify-center py-2">
              <p className="text-sm text-muted-foreground">
                Loading more dives...
              </p>
            </div>
          ) : null
        }
        scrollThreshold="200px"
      >
        <div className="space-y-3">
          {items.map((item, index) => (
            <FeedItemRenderer
              key={item.id}
              item={item}
              position={index}
              onAction={onAction}
            />
          ))}
        </div>
      </InfiniteScroll>

      {showLoginToSeeMore && !hasMore && items.length > 0 ? (
        <Card className="p-4 text-center">
          <p className="text-sm font-medium">Public preview limit reached</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to see more contents.
          </p>
          <div className="mt-3">
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Log in to continue
            </Link>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
