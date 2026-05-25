"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { useEffect, useState } from "react";

import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import { Badge } from "@/components/ui/badge";
import { MediaPostActions } from "@/features/media/components/MediaPostActions";
import { MediaPostSocialPanel } from "@/features/media/components/MediaPostSocialPanel";
import { MediaViewerDialog } from "@/features/media/components/MediaViewerDialog";
import {
  MomentPlayer,
  momentPlaybackFromUrls,
} from "@/features/media/components/MomentPlayer";
import { useMintedMediaMap } from "@/features/media/hooks";
import type { MediaPostDisplay } from "@/features/media/types/post-display";
import { cn } from "@/lib/utils";

type MediaPostComponentProps = {
  post: MediaPostDisplay;
  actions?: React.ReactNode;
  className?: string;
};

export function MediaPostComponent({
  post,
  actions,
  className,
}: MediaPostComponentProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [commentFocusSignal, setCommentFocusSignal] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const preview = post.media[0];
  const minted = useMintedMediaMap(
    preview && !preview.displayUrl ? [preview.mediaObjectId] : [],
    "card",
    Boolean(preview && !preview.displayUrl),
  );
  const previewUrl =
    preview?.displayUrl ??
    preview?.thumbnailUrl ??
    (preview ? minted.urlMap.get(preview.mediaObjectId) : undefined);
  const previewPlayback =
    preview?.type === "video"
      ? momentPlaybackFromUrls({
          playback: preview.playback,
          playbackUrl: preview.playbackUrl,
          posterUrl: preview.thumbnailUrl ?? previewUrl,
        })
      : null;
  const canOpenPreview =
    preview?.type === "video"
      ? Boolean(preview.playback?.hlsUrl || preview.playback?.iframeUrl || preview.playbackUrl)
      : Boolean(previewUrl);
  const diveSiteHref = post.diveSite?.slug
    ? `/explore/sites/${post.diveSite.slug}`
    : undefined;
  const locationText = [post.diveSite?.name, post.diveSite?.area]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    setImageLoaded(false);
  }, [previewUrl]);

  return (
    <>
      <article className={cn("relative border-b border-border/70 py-4", className)}>
        <div className="space-y-3">
          <header>
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <UserIdentityHeader
                displayName={post.author.displayName}
                username={post.author.username}
                avatarUrl={post.author.avatarUrl}
                location={
                  locationText && diveSiteHref ? (
                    <Link
                      href={diveSiteHref}
                      className="hover:text-foreground hover:underline"
                    >
                      {locationText}
                    </Link>
                  ) : (
                    locationText
                  )
                }
                className="min-w-[12rem] flex-1"
              />
              <div className="flex max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                <span
                  className="inline-flex size-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-800"
                  aria-hidden="true"
                >
                  <Camera className="size-3.5" />
                </span>
                <Badge
                  variant="outline"
                  className="h-6 border-sky-500/30 bg-sky-500/10 px-2 text-sky-800"
                >
                  {post.badgeLabel}
                </Badge>
                {post.itemCount && post.itemCount > 1 ? (
                  <Badge variant="outline" className="h-6 px-2">
                    {post.itemCount} photos
                  </Badge>
                ) : null}
              </div>
            </div>
          </header>

          {preview ? (
            <div
              className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-left"
            >
              {!imageLoaded ? (
                <div className="absolute inset-0 animate-pulse bg-muted" />
              ) : null}
              {preview.type === "video" && previewPlayback ? (
                <MomentPlayer
                  hlsUrl={previewPlayback.hlsUrl}
                  iframeUrl={previewPlayback.iframeUrl}
                  posterUrl={previewPlayback.posterUrl}
                  title={preview.alt}
                  muted
                  controls={false}
                  playsInline
                  className="absolute inset-0"
                  videoClassName="object-cover"
                  iframeClassName="object-cover"
                  onReady={() => setImageLoaded(true)}
                />
              ) : previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={preview.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 672px"
                  className={cn(
                    "object-cover transition-[opacity,transform] duration-200 hover:scale-[1.01]",
                    imageLoaded ? "opacity-100" : "opacity-0",
                  )}
                  unoptimized
                  onLoad={() => setImageLoaded(true)}
                />
              ) : null}
              {canOpenPreview ? (
                <button
                  type="button"
                  className="absolute inset-0 z-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Open ${preview.alt}`}
                  onClick={() => setViewerOpen(true)}
                />
              ) : null}
            </div>
          ) : null}

          <p className="line-clamp-3 text-sm leading-relaxed text-foreground">
            {post.caption}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <MediaPostActions
            postId={post.id}
            href={post.href}
            likeCount={post.likeCount}
            commentCount={post.commentCount}
            viewerHasLiked={post.viewerHasLiked}
            viewerHasSaved={post.viewerHasSaved}
            onCommentClick={() => {
              setViewerOpen(true);
              setCommentFocusSignal((signal) => signal + 1);
            }}
          />
          {actions}
        </div>
      </article>

      <MediaViewerDialog
        items={post.media.map((item) => ({
          id: item.id,
          mediaObjectId: item.mediaObjectId,
          type: item.type,
          displayUrl: item.dialogUrl || item.displayUrl,
          playbackUrl: item.playbackUrl,
          playback: item.playback,
          thumbnailUrl: item.thumbnailUrl,
          width: item.width,
          height: item.height,
          caption: item.caption,
          alt: item.alt,
        }))}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        renderSidebar={(activeItem) => {
          const selected = post.media.find((item) => item.id === activeItem.id);
          return (
            <MediaPostSocialPanel
              postId={post.id}
              href={post.href}
              authorName={post.author.displayName}
              authorUsername={post.author.username}
              authorAvatarUrl={post.author.avatarUrl}
              diveSiteName={post.diveSite?.name}
              diveSiteArea={post.diveSite?.area}
              diveSiteHref={diveSiteHref}
              caption={selected?.caption?.trim() || post.caption}
              likeCount={post.likeCount}
              commentCount={post.commentCount}
              viewerHasLiked={post.viewerHasLiked}
              viewerHasSaved={post.viewerHasSaved}
              focusCommentsSignal={commentFocusSignal}
              commentsScrollMode="desktop"
            />
          );
        }}
      />
    </>
  );
}
