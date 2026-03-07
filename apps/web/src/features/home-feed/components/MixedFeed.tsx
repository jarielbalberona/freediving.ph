"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
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

  if (items.length === 0 && !loading) {
    return <p className="text-sm text-muted-foreground">No feed items yet for this mode.</p>;
  }

  return (
    <section className="space-y-3">
      {items.map((item, index) => (
        <FeedItemRenderer key={item.id} item={item} position={index} onAction={onAction} />
      ))}

      {hasMore ? (
        <div className="flex justify-center py-2">
          <Button type="button" variant="outline" onClick={onLoadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}

      {showLoginToSeeMore && !hasMore && items.length > 0 ? (
        <Card className="p-4 text-center">
          <p className="text-sm font-medium">Public preview limit reached</p>
          <p className="mt-1 text-xs text-muted-foreground">Sign in to see more contents.</p>
          <div className="mt-3">
            <Link href="/sign-in" className={cn(buttonVariants({ size: "sm" }))}>
              Log in to continue
            </Link>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
