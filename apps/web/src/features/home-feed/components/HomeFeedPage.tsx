"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { HomeFeedItem, HomeFeedMode } from "@freediving.ph/types";

import { activityToHomeFeedItems } from "@/features/home-feed/adapters/activity-to-home-feed";
import { FeedModeTabs } from "@/features/home-feed/components/FeedModeTabs";
import { HomeHero } from "@/features/home-feed/components/HomeHero";
import { HomeQuickActions } from "@/features/home-feed/components/HomeQuickActions";
import { MixedFeed } from "@/features/home-feed/components/MixedFeed";
import { NearbyConditionsCard } from "@/features/home-feed/components/NearbyConditionsCard";
import { useActivityFeedQuery } from "@/features/home-feed/hooks/queries/useActivityFeedQuery";
import { useHomeFeedQuery } from "@/features/home-feed/hooks/queries/useHomeFeedQuery";

type FeedSource = "home" | "activity";
type FeedCursor = {
  value: string;
  source: FeedSource;
  mode: HomeFeedMode;
};
type FeedItemsState = {
  source: FeedSource;
  mode: HomeFeedMode;
  items: HomeFeedItem[];
};

export function HomeFeedPage({
  initialFeedSource = "activity",
}: {
  initialFeedSource?: FeedSource;
}) {
  const { isSignedIn } = useAuth();
  const [mode, setMode] = useState<HomeFeedMode>("latest");
  const [cursor, setCursor] = useState<FeedCursor | undefined>(undefined);
  const [itemsState, setItemsState] = useState<FeedItemsState | undefined>();

  const feedSource: FeedSource =
    initialFeedSource === "home" ? "home" : "activity";
  const usingActivityFeed = feedSource === "activity";
  const cursorValue =
    cursor?.source === feedSource && cursor.mode === mode
      ? cursor.value
      : undefined;

  const homeQuery = useHomeFeedQuery({
    mode,
    cursor: cursorValue,
    enabled: !usingActivityFeed,
  });
  const activityQuery = useActivityFeedQuery({
    filter: mode,
    cursor: cursorValue,
    enabled: usingActivityFeed,
  });
  const query = usingActivityFeed ? activityQuery : homeQuery;
  const responseItems = useMemo(
    () =>
      usingActivityFeed
        ? activityToHomeFeedItems(activityQuery.data?.items ?? [])
        : (homeQuery.data?.items ?? []),
    [usingActivityFeed, activityQuery.data?.items, homeQuery.data?.items],
  );
  const items =
    itemsState?.source === feedSource && itemsState.mode === mode
      ? itemsState.items
      : !cursorValue && query.data
        ? responseItems
        : [];

  useEffect(() => {
    setCursor(undefined);
  }, [mode, feedSource]);

  useEffect(() => {
    if (!query.data) return;
    if (!cursorValue) {
      setItemsState({ source: feedSource, mode, items: responseItems });
      return;
    }
    setItemsState((current) => {
      const currentItems =
        current?.source === feedSource && current.mode === mode
          ? current.items
          : [];
      const map = new Map(currentItems.map((item) => [item.id, item]));
      for (const item of responseItems) {
        map.set(item.id, item);
      }
      return { source: feedSource, mode, items: Array.from(map.values()) };
    });
  }, [query.data, responseItems, cursorValue, feedSource, mode]);

  useEffect(() => {
    if (!usingActivityFeed || process.env.NODE_ENV === "production") return;
    const types = responseItems.map((item) => item.type);
    console.debug("Activity feed", {
      source: feedSource,
      mode,
      itemCount: responseItems.length,
      itemTypes: types,
      hasNextCursor: Boolean(activityQuery.data?.nextCursor),
    });
  }, [
    usingActivityFeed,
    activityQuery.data?.nextCursor,
    feedSource,
    mode,
    responseItems,
  ]);

  const canLoadMore = Boolean(query.data?.nextCursor);
  const initialLoading = !query.data && query.isFetching;

  const onLoadMore = () => {
    if (!query.data?.nextCursor || query.isFetching) return;
    setCursor({
      value: query.data.nextCursor,
      source: feedSource,
      mode,
    });
  };

  const context = homeQuery.data?.context ?? {
    greeting: "Good day, diver",
    message: "Finding the latest from the freediving community...",
    safetyBadge: "Dive with a buddy",
  };

  const actions = useMemo(
    () =>
      homeQuery.data?.quickActions ?? [
        { type: "find_buddy", label: "Find buddy" },
        { type: "explore_spots", label: "Explore spots" },
        { type: "open_chika", label: "Join Chika" },
        { type: "join_event", label: "See events" },
      ],
    [homeQuery.data?.quickActions],
  );

  const nearbyCondition = homeQuery.data?.nearbyCondition ?? {
    spot: "Philippines",
    safety: "Check locally",
    current: "Ask locally",
    visibility: "Varies",
    waterTemp: "Varies",
    wind: "Check forecast",
    sunrise: "Plan ahead",
  };

  return (
    <main className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <HomeHero context={context} mode={mode} />
        <HomeQuickActions actions={actions} />
        <NearbyConditionsCard condition={nearbyCondition} />
        <FeedModeTabs mode={mode} onChange={setMode} />

        {query.error ? (
          <p className="text-sm text-destructive">
            Community updates are taking longer than expected. You can still
            explore dive spots, find buddies, or open Chika.
          </p>
        ) : null}

        <MixedFeed
          mode={mode}
          source={feedSource}
          items={items}
          loading={initialLoading}
          hasMore={canLoadMore}
          onLoadMore={onLoadMore}
          showLoginToSeeMore={!isSignedIn}
          telemetryEnabled
        />
      </div>
    </main>
  );
}
