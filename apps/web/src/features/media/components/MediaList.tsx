"use client";

import type { MediaUploadResponse } from "@freediving.ph/types";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { MediaCard } from "./MediaCard";
import { useListMyMedia, useMintMediaUrls } from "../hooks";

interface MediaListProps {
  contextType?:
    | "profile_avatar"
    | "profile_feed"
    | "chika_attachment"
    | "event_attachment"
    | "dive_spot_attachment"
    | "group_cover";
}

export function MediaList({ contextType }: MediaListProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<MediaUploadResponse[]>([]);
  const [selected, setSelected] = useState<MediaUploadResponse | null>(null);

  const listQuery = useListMyMedia({ limit: 30, cursor, contextType });

  const pageItems = listQuery.data?.items ?? [];
  const allItems = useMemo(() => {
    if (cursor === undefined) {
      return pageItems;
    }
    return [...items, ...pageItems];
  }, [cursor, items, pageItems]);

  const cardMintQuery = useMintMediaUrls(
    allItems.map((item) => ({ mediaId: item.id, preset: "card" as const })),
    allItems.length > 0,
  );

  const dialogMintQuery = useMintMediaUrls(
    selected ? [{ mediaId: selected.id, preset: "dialog" as const }] : [],
    !!selected,
  );

  const cardUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of cardMintQuery.data?.items ?? []) {
      map.set(item.mediaId, item.url);
    }
    return map;
  }, [cardMintQuery.data?.items]);

  const dialogUrl = dialogMintQuery.data?.items?.[0]?.url;

  const loadMore = () => {
    const nextCursor = listQuery.data?.nextCursor;
    if (!nextCursor) return;
    setItems(allItems);
    setCursor(nextCursor);
  };

  if (listQuery.isLoading && allItems.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading media...</p>;
  }

  if (listQuery.error) {
    return <p className="text-sm text-destructive">Failed to load media.</p>;
  }

  if (allItems.length === 0) {
    return <p className="text-sm text-muted-foreground">No media uploaded yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allItems.map((media) => (
          <MediaCard
            key={media.id}
            media={media}
            imageUrl={cardUrlMap.get(media.id)}
            onSelect={setSelected}
          />
        ))}
      </div>

      {listQuery.data?.nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Button onClick={loadMore} disabled={listQuery.isFetching} variant="outline">
            {listQuery.isFetching ? "Loading..." : "Load More"}
          </Button>
        </div>
      ) : null}

      {selected ? (
        <div className="mt-6 rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{selected.contextType}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          {dialogUrl ? (
            <img
              src={dialogUrl}
              alt={selected.objectKey}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          ) : (
            <div className="h-72 w-full animate-pulse rounded-md bg-muted" />
          )}
        </div>
      ) : null}
    </>
  );
}
