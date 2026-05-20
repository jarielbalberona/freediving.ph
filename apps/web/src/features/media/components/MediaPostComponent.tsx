"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { useState } from "react";

import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import { Badge } from "@/components/ui/badge";
import { MediaPostActions } from "@/features/media/components/MediaPostActions";
import { MediaPostSocialPanel } from "@/features/media/components/MediaPostSocialPanel";
import { MediaViewerDialog } from "@/features/media/components/MediaViewerDialog";
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
  const preview = post.media[0];
  const minted = useMintedMediaMap(
    preview && !preview.displayUrl ? [preview.mediaObjectId] : [],
    "card",
    Boolean(preview && !preview.displayUrl),
  );
  const previewUrl =
    preview?.displayUrl ??
    (preview ? minted.urlMap.get(preview.mediaObjectId) : undefined);
  const diveSiteHref = post.diveSite?.slug
    ? `/explore/sites/${post.diveSite.slug}`
    : undefined;
  const locationText = [post.diveSite?.name, post.diveSite?.area]
    .filter(Boolean)
    .join(" · ");

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

          {preview && previewUrl ? (
            <button
              type="button"
              className="block overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-left"
              onClick={() => setViewerOpen(true)}
            >
              <Image
                src={previewUrl}
                alt={preview.alt}
                width={preview.width}
                height={preview.height}
                className="h-auto w-full object-cover transition-transform duration-200 hover:scale-[1.01]"
                unoptimized
              />
            </button>
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
          displayUrl: item.dialogUrl || item.displayUrl,
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
            />
          );
        }}
      />
    </>
  );
}
