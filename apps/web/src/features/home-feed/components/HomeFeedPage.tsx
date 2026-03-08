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
    message: "Loading your feed context...",
    safetyBadge: "Dive with a buddy",
  };

  const actions = useMemo(
    () =>
      query.data?.quickActions ?? [
        { type: "log_dive", label: "Log dive" },
        { type: "find_buddy", label: "Find buddy" },
        { type: "explore_spots", label: "Explore spots" },
        { type: "create_session", label: "Create session" },
      ],
    [query.data?.quickActions],
  );

  const nearbyCondition = query.data?.nearbyCondition ?? {
    spot: "Loading",
    safety: "Stable",
    current: "--",
    visibility: "--",
    waterTemp: "--",
    wind: "--",
    sunrise: "--",
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
            Failed to load feed. Sign in and try again.
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
