"use client";

import Image from "next/image";

import { MediaPostSocialPanel } from "@/features/media/components/MediaPostSocialPanel";
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

      <aside className="min-h-[70vh] lg:sticky lg:top-20 lg:self-start">
        <MediaPostSocialPanel
          postId={postId}
          href={href}
          authorName={detail.author.displayName}
          authorUsername={detail.author.username}
          authorAvatarUrl={detail.author.avatarUrl}
          diveSiteName={items[0]?.diveSite.name}
          diveSiteArea={items[0]?.diveSite.area}
          diveSiteHref={
            items[0]?.diveSite.slug
              ? `/explore/sites/${items[0].diveSite.slug}`
              : undefined
          }
          caption={caption}
          likeCount={detail.post.likeCount}
          commentCount={detail.post.commentCount}
          viewerHasLiked={detail.post.viewerHasLiked}
          viewerHasSaved={detail.post.viewerHasSaved}
          className="h-full rounded-lg border bg-background"
          commentsClassName="max-h-[50vh] lg:max-h-none"
        />
      </aside>
    </main>
  );
}
