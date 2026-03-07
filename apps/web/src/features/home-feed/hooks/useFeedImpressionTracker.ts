"use client";

import { useEffect, useRef } from "react";

import { postFeedImpressions } from "@/features/home-feed/api/post-feed-impressions";
import type { HomeFeedItem, HomeFeedMode } from "@freediving.ph/types";

export const useFeedImpressionTracker = (params: {
  sessionId: string;
  mode: HomeFeedMode;
  items: HomeFeedItem[];
}) => {
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        const payloadItems = visible
          .map((entry) => {
            const itemId = entry.target.getAttribute("data-feed-item-id") || "";
            const entityId = entry.target.getAttribute("data-entity-id") || "";
            const entityType = entry.target.getAttribute("data-entity-type") || "";
            const positionRaw = entry.target.getAttribute("data-position") || "0";
            const position = Number.parseInt(positionRaw, 10) || 0;
            if (!itemId || seenRef.current.has(itemId)) return null;
            seenRef.current.add(itemId);
            return {
              feedItemId: itemId,
              entityId,
              entityType,
              position,
              seenAt: new Date().toISOString(),
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        if (payloadItems.length === 0) return;

        void postFeedImpressions({
          sessionId: params.sessionId,
          mode: params.mode,
          items: payloadItems,
        });
      },
      { threshold: 0.6 },
    );

    const targets = document.querySelectorAll<HTMLElement>("[data-feed-item-id]");
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [params.items, params.mode, params.sessionId]);
};
