"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UsernameLink } from "@/components/common/UsernameLink";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";
import { MediaViewerDialog } from "@/features/media/components/MediaViewerDialog";
import { useMintedMediaMap } from "@/features/media/hooks";
import type { HomeFeedItem } from "@freediving.ph/types";

type MediaPostPayload = {
  authorName?: string;
  authorUsername?: string;
  diveSiteSlug?: string;
  diveSiteName?: string;
  area?: string;
  postCaption?: string;
  previewCaption?: string;
  previewMediaId?: string;
  previewWidth?: number;
  previewHeight?: number;
  itemCount?: number;
  items?: Array<{
    id: string;
    mediaObjectId: string;
    width: number;
    height: number;
    caption?: string;
    sortOrder: number;
  }>;
};

export function MediaPostCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as MediaPostPayload;
  const [viewerOpen, setViewerOpen] = useState(false);
  const previewMediaId = payload.previewMediaId?.trim() ?? "";
  const preview = useMintedMediaMap(
    previewMediaId ? [previewMediaId] : [],
    "card",
    Boolean(previewMediaId),
  );
  const previewUrl = previewMediaId
    ? preview.urlMap.get(previewMediaId)
    : undefined;
  const caption =
    payload.postCaption?.trim() ||
    payload.previewCaption?.trim() ||
    "No caption";
  const viewerItems =
    payload.items?.map((photo, index) => ({
      id: photo.id || `${item.id}-${index + 1}`,
      mediaObjectId: photo.mediaObjectId,
      width: photo.width,
      height: photo.height,
      caption: photo.caption,
      alt: photo.caption?.trim() || caption,
    })) ?? [];

  return (
    <>
      <FeedCardShell item={item} actions={actions}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar displayName={payload.authorName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {payload.authorName || "Diver"}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <UsernameLink
                  username={payload.authorUsername}
                  className="truncate text-xs text-muted-foreground"
                />
                {payload.diveSiteSlug && payload.diveSiteName ? (
                  <Link
                    href={`/explore/sites/${payload.diveSiteSlug}`}
                    className="truncate hover:underline"
                  >
                    {payload.diveSiteName}
                  </Link>
                ) : null}
                {payload.area ? <span>{payload.area}</span> : null}
              </div>
            </div>
          </div>
          {payload.itemCount && payload.itemCount > 1 ? (
            <Badge variant="outline">{payload.itemCount} photos</Badge>
          ) : null}
        </div>

        {previewUrl && payload.previewWidth && payload.previewHeight ? (
          <button
            type="button"
            className="block overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-left"
            onClick={() => setViewerOpen(true)}
          >
            <Image
              src={previewUrl}
              alt={caption}
              width={payload.previewWidth}
              height={payload.previewHeight}
              className="h-auto w-full object-cover transition-transform duration-200 hover:scale-[1.01]"
              unoptimized
            />
          </button>
        ) : null}

        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">
          {caption}
        </p>
      </FeedCardShell>

      <MediaViewerDialog
        items={viewerItems}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        renderSidebar={(activeItem) => {
          const selectedPhoto =
            payload.items?.find((photo) => photo.id === activeItem.id) ?? null;

          return (
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <UserAvatar displayName={payload.authorName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {payload.authorName || "Diver"}
                  </p>
                  <UsernameLink
                    username={payload.authorUsername}
                    className="truncate text-xs text-muted-foreground"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {payload.diveSiteName || "Dive site unavailable"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {payload.area || "Location unavailable"}
                </p>
              </div>
              <p className="text-sm leading-6 text-foreground">
                {selectedPhoto?.caption?.trim() || caption}
              </p>
            </div>
          );
        }}
      />
    </>
  );
}
