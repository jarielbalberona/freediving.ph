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
import type {
  FeedSource,
  HomeFeedItem,
  HomeFeedMode,
} from "@freediving.ph/types";

export function MixedFeed({
  mode,
  source = "home",
  items,
  loading,
  hasMore,
  onLoadMore,
  showLoginToSeeMore,
  telemetryEnabled = true,
}: {
  mode: HomeFeedMode;
  source?: FeedSource;
  items: HomeFeedItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  showLoginToSeeMore: boolean;
  telemetryEnabled?: boolean;
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
    source,
    mode,
    items,
    enabled: telemetryEnabled,
  });

  const onAction = (item: HomeFeedItem, actionType: string) => {
    if (!telemetryEnabled) return;
    actionMutation.mutate({
      sessionId,
      source,
      mode,
      items: [
        {
          feedItemId: item.id,
          entityType: item.telemetryEntityType ?? item.type,
          entityId: item.telemetryEntityId ?? item.entityId,
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
      latest: {
        title: "No recent activity yet",
        body: "Recent public and member-safe community activity will appear here as divers post updates.",
        href: "/chika",
        action: "Open Chika",
      },
      nearby: {
        title: "Local updates will appear here",
        body: "Nearby only shows items tied to your home area or an explicit area filter.",
        href: "/explore",
        action: "Explore spots",
      },
      chika: {
        title: "No recent Chika threads",
        body: "Public Chika threads will appear here without mixing in unrelated feed cards.",
        href: "/chika",
        action: "Start a Chika",
      },
      "dive-reports": {
        title: "No dive reports yet",
        body: "Dive reports only show site updates and condition-like activity.",
        href: "/explore",
        action: "Browse dive spots",
      },
      events: {
        title: "No eligible events yet",
        body: "Published events you are allowed to see will appear here.",
        href: "/events",
        action: "Browse events",
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
              showActions={telemetryEnabled}
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
