"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { UsernameLink } from "@/components/common/UsernameLink";
import { MediaPostActions } from "@/features/media/components/MediaPostActions";
import { MediaPostComments } from "@/features/media/components/MediaPostComments";
import { useMediaPostQuery, useMintedMediaMap } from "@/features/media/hooks";

type MediaPostDetailPageProps = {
  username: string;
  postId: string;
};

export default function MediaPostDetailPage({
  username,
  postId,
}: MediaPostDetailPageProps) {
  const postQuery = useMediaPostQuery(postId);
  const detail = postQuery.data?.post;
  const items = detail?.items ?? [];
  const minted = useMintedMediaMap(
    items.map((item) => item.mediaObjectId),
    "dialog",
    items.length > 0,
  );

  if (postQuery.isError) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Post unavailable.</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading post...</p>
      </main>
    );
  }

  if (detail.author.username.toLowerCase() !== username.toLowerCase()) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Post unavailable.</p>
      </main>
    );
  }

  const caption = detail.post.postCaption?.trim() || "No caption added.";
  const href = `/${username}/posts/${postId}`;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-3">
        {items.map((item) => {
          const url = minted.urlMap.get(item.mediaObjectId);
          if (!url) {
            return (
              <div
                key={item.id}
                className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground"
              >
                Loading media...
              </div>
            );
          }
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-border/70 bg-muted/20"
            >
              <Image
                src={url}
                alt={item.caption?.trim() || caption}
                width={item.width}
                height={item.height}
                className="h-auto w-full object-cover"
                unoptimized
              />
            </div>
          );
        })}
      </section>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={detail.author.avatarUrl}
              displayName={detail.author.displayName}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {detail.author.displayName}
              </p>
              <UsernameLink
                username={detail.author.username}
                className="truncate text-xs text-muted-foreground"
              />
            </div>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {caption}
          </p>

          {items[0]?.diveSite ? (
            <Link
              href={`/explore/sites/${items[0].diveSite.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <MapPin className="size-4" />
              <span>
                {items[0].diveSite.name}
                {items[0].diveSite.area ? ` · ${items[0].diveSite.area}` : ""}
              </span>
            </Link>
          ) : null}

          <MediaPostActions
            postId={postId}
            href={href}
            likeCount={detail.post.likeCount}
            commentCount={detail.post.commentCount}
            viewerHasLiked={detail.post.viewerHasLiked}
            viewerHasSaved={detail.post.viewerHasSaved}
          />
        </div>

        <MediaPostComments postId={postId} />
      </aside>
    </main>
  );
}
