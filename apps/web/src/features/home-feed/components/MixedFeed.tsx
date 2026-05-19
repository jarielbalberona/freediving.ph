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
        <p className="text-sm font-semibold">Looking for community updates</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We are checking recent dives, buddy posts, Chika, and spot reports.
          This usually only takes a moment.
        </p>
      </Card>
    );
  }

  if (items.length === 0 && !loading) {
    const emptyCopy: Record<
      HomeFeedMode,
      { title: string; body: string; href: string; action: string }
    > = {
      following: {
        title: "Your feed is ready to grow",
        body: "Follow divers, join Chika, or browse dive spots to start shaping what appears here.",
        href: "/chika",
        action: "Open Chika",
      },
      nearby: {
        title: "Local updates will appear here",
        body: "When divers share buddy posts or spot activity near you, this feed becomes your local pulse.",
        href: "/explore",
        action: "Explore spots",
      },
      training: {
        title: "Training is quiet right now",
        body: "Training posts from the community will show here when divers share progress or sessions.",
        href: "/chika",
        action: "Start a Chika",
      },
      "spot-reports": {
        title: "Spot reports will appear here",
        body: "Condition updates show up when divers share what they saw at a dive site.",
        href: "/explore",
        action: "Browse dive spots",
      },
    };
    const copy = emptyCopy[mode];

    return (
      <Card className="p-5">
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
        <div className="mt-4">
          <Link href={copy.href} className={cn(buttonVariants({ size: "sm" }))}>
            {copy.action}
          </Link>
        </div>
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
                Bringing in more community updates...
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
            Sign in to see more community updates.
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
