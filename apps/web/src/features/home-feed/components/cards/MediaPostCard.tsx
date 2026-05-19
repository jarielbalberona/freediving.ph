"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UsernameLink } from "@/components/common/UsernameLink";
import {
  FeedCardShell,
  FeedItemHeader,
} from "@/features/home-feed/components/FeedCardShell";
import { MediaPostActions } from "@/features/media/components/MediaPostActions";
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
  previewDisplayUrl?: string;
  previewDialogUrl?: string;
  previewWidth?: number;
  previewHeight?: number;
  likeCount?: number;
  commentCount?: number;
  viewerHasLiked?: boolean;
  viewerHasSaved?: boolean;
  itemCount?: number;
  items?: Array<{
    id: string;
    mediaObjectId: string;
    displayUrl?: string;
    dialogUrl?: string;
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
  const previewDisplayUrl = payload.previewDisplayUrl?.trim() ?? "";
  const preview = useMintedMediaMap(
    previewMediaId && !previewDisplayUrl ? [previewMediaId] : [],
    "card",
    Boolean(previewMediaId && !previewDisplayUrl),
  );
  const previewUrl = previewDisplayUrl
    ? previewDisplayUrl
    : previewMediaId
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
      displayUrl: photo.dialogUrl || photo.displayUrl,
      width: photo.width,
      height: photo.height,
      caption: photo.caption,
      alt: photo.caption?.trim() || caption,
    })) ?? [];
  const mediaActions = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <MediaPostActions
        postId={item.entityId}
        href={item.detailHref}
        likeCount={payload.likeCount ?? 0}
        commentCount={payload.commentCount ?? 0}
        viewerHasLiked={payload.viewerHasLiked ?? false}
        viewerHasSaved={payload.viewerHasSaved ?? false}
      />
      {actions}
    </div>
  );

  return (
    <>
      <FeedCardShell item={item} actions={mediaActions}>
        <FeedItemHeader
          item={item}
          displayName={payload.authorName || "Diver"}
          username={payload.authorUsername}
          metadata={[
            payload.diveSiteSlug && payload.diveSiteName ? (
              <Link
                href={`/explore/sites/${payload.diveSiteSlug}`}
                className="hover:underline"
              >
                {payload.diveSiteName}
              </Link>
            ) : null,
            payload.area,
          ]}
          typeExtras={
            payload.itemCount && payload.itemCount > 1 ? (
              <Badge variant="outline" className="h-6 px-2">
                {payload.itemCount} photos
              </Badge>
            ) : null
          }
        />

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

        {item.detailHref ? (
          <Link
            href={item.detailHref}
            className="block line-clamp-3 text-sm leading-relaxed text-foreground hover:underline"
          >
            {caption}
          </Link>
        ) : (
          <p className="line-clamp-3 text-sm leading-relaxed text-foreground">
            {caption}
          </p>
        )}

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
              <MediaPostActions
                postId={item.entityId}
                href={item.detailHref}
                likeCount={payload.likeCount ?? 0}
                commentCount={payload.commentCount ?? 0}
                viewerHasLiked={payload.viewerHasLiked ?? false}
                viewerHasSaved={payload.viewerHasSaved ?? false}
              />
            </div>
          );
        }}
      />
    </>
  );
}
