"use client";

import { useMemo } from "react";
import Link from "next/link";
import InfiniteScroll from "react-infinite-scroll-component";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FeedItemRenderer } from "@/features/home-feed/components/FeedItemRenderer";
import { useFeedActionMutation } from "@/features/home-feed/hooks/mutations/useFeedActionMutation";
import { useFeedImpressionTracker } from "@/features/home-feed/hooks/useFeedImpressionTracker";
import type {
  FeedSource,
  HomeFeedItem,
  HomeFeedMode,
} from "@freediving.ph/types";

function FeedSkeleton() {
  return (
    <div className="divide-y divide-border/70">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={`home-feed-skeleton-${index + 1}`} className="py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          {index === 1 ? (
            <Skeleton className="mt-3 aspect-[4/3] w-full rounded-2xl" />
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
    return <FeedSkeleton />;
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
        action: "Join Chika",
      },
      nearby: {
        title: "Local updates will appear here",
        body: "Nearby only shows items tied to your home area or an explicit area filter.",
        href: "/explore",
        action: "Explore spots",
      },
      chika: {
        title: "No recent Chika yet",
        body: "Public Chika conversations will appear here without mixing in unrelated feed cards.",
        href: "/chika",
        action: "Start a Chika",
      },
      "dive-reports": {
        title: "No dive reports yet",
        body: "Site notes and condition updates from divers will appear here.",
        href: "/explore",
        action: "Browse dive spots",
      },
      events: {
        title: "No upcoming events yet",
        body: "Published events from the community will appear here.",
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
            <div className="flex justify-center py-3">
              <p className="text-sm text-muted-foreground">
                Bringing in more community updates...
              </p>
            </div>
          ) : null
        }
        scrollThreshold="200px"
      >
        <div>
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
