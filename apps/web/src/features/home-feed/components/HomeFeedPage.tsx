"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { HomeFeedItem, HomeFeedMode } from "@freediving.ph/types";

import { FeedModeTabs } from "@/features/home-feed/components/FeedModeTabs";
import { HomeHero } from "@/features/home-feed/components/HomeHero";
import { HomeQuickActions } from "@/features/home-feed/components/HomeQuickActions";
import { MixedFeed } from "@/features/home-feed/components/MixedFeed";
import { NearbyConditionsCard } from "@/features/home-feed/components/NearbyConditionsCard";
import { useHomeFeedQuery } from "@/features/home-feed/hooks/queries/useHomeFeedQuery";

export function HomeFeedPage() {
  const { isSignedIn } = useAuth();
  const [mode, setMode] = useState<HomeFeedMode>("following");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<HomeFeedItem[]>([]);

  const query = useHomeFeedQuery({ mode, cursor });

  useEffect(() => {
    if (!query.data) return;
    if (!cursor) {
      setItems(query.data.items);
      return;
    }
    setItems((current) => {
      const map = new Map(current.map((item) => [item.id, item]));
      for (const item of query.data.items) {
        map.set(item.id, item);
      }
      return Array.from(map.values());
    });
  }, [query.data, cursor]);

  useEffect(() => {
    setCursor(undefined);
    setItems([]);
  }, [mode]);

  const canLoadMore = Boolean(query.data?.nextCursor);

  const onLoadMore = () => {
    if (!query.data?.nextCursor || query.isFetching) return;
    setCursor(query.data.nextCursor);
  };

  const context = query.data?.context ?? {
    greeting: "Good day, diver",
    message: "Finding the latest from the freediving community...",
    safetyBadge: "Dive with a buddy",
  };

  const actions = useMemo(
    () =>
      query.data?.quickActions ?? [
        { type: "find_buddy", label: "Find buddy" },
        { type: "explore_spots", label: "Explore spots" },
        { type: "open_chika", label: "Join Chika" },
        { type: "join_event", label: "See events" },
      ],
    [query.data?.quickActions],
  );

  const nearbyCondition = query.data?.nearbyCondition ?? {
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
          items={items}
          loading={query.isFetching}
          hasMore={canLoadMore}
          onLoadMore={onLoadMore}
          showLoginToSeeMore={!isSignedIn}
        />
      </div>
    </main>
  );
}
