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

export function HomeFeedPage({
  initialFeedSource = "home",
}: {
  initialFeedSource?: FeedSource;
}) {
  const { isSignedIn } = useAuth();
  const [mode, setMode] = useState<HomeFeedMode>("latest");
  const [cursor, setCursor] = useState<FeedCursor | undefined>(undefined);
  const [items, setItems] = useState<HomeFeedItem[]>([]);

  const feedSource: FeedSource =
    initialFeedSource === "activity" ? "activity" : "home";
  const activityPreview = feedSource === "activity";
  const cursorValue =
    cursor?.source === feedSource && cursor.mode === mode
      ? cursor.value
      : undefined;

  const homeQuery = useHomeFeedQuery({
    mode,
    cursor: cursorValue,
    enabled: !activityPreview,
  });
  const activityQuery = useActivityFeedQuery({
    filter: mode,
    cursor: cursorValue,
    enabled: activityPreview,
  });
  const query = activityPreview ? activityQuery : homeQuery;
  const responseItems = useMemo(
    () =>
      activityPreview
        ? activityToHomeFeedItems(activityQuery.data?.items ?? [])
        : (homeQuery.data?.items ?? []),
    [activityPreview, activityQuery.data?.items, homeQuery.data?.items],
  );

  useEffect(() => {
    setCursor(undefined);
    setItems([]);
  }, [mode, feedSource]);

  useEffect(() => {
    if (!query.data) return;
    if (!cursorValue) {
      setItems(responseItems);
      return;
    }
    setItems((current) => {
      const map = new Map(current.map((item) => [item.id, item]));
      for (const item of responseItems) {
        map.set(item.id, item);
      }
      return Array.from(map.values());
    });
  }, [query.data, responseItems, cursorValue]);

  useEffect(() => {
    if (!activityPreview || process.env.NODE_ENV === "production") return;
    const types = responseItems.map((item) => item.type);
    console.debug("Activity feed preview", {
      source: feedSource,
      mode,
      itemCount: responseItems.length,
      itemTypes: types,
      hasNextCursor: Boolean(activityQuery.data?.nextCursor),
    });
  }, [
    activityPreview,
    activityQuery.data?.nextCursor,
    feedSource,
    mode,
    responseItems,
  ]);

  const canLoadMore = Boolean(query.data?.nextCursor);

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
        {activityPreview ? (
          <div className="rounded-lg border border-dashed border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-800 dark:text-sky-200">
            Activity feed preview
          </div>
        ) : null}

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
          loading={query.isFetching}
          hasMore={canLoadMore}
          onLoadMore={onLoadMore}
          showLoginToSeeMore={!isSignedIn}
          telemetryEnabled
        />
      </div>
    </main>
  );
}
