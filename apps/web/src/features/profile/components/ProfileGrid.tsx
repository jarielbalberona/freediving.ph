"use client";

import { useState } from "react";
import Image from "next/image";
import { Clapperboard, Heart, ImageOff, MessageCircleMore, XIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileTile } from "@/features/profile/components/ProfileTile";
import type { ProfilePost } from "@/features/profile/types";

type ProfileGridProps = {
  posts: ProfilePost[];
  isLoading: boolean;
  username: string;
  displayName: string;
  avatarUrl?: string;
};

const formatMetric = (value?: number): string =>
  new Intl.NumberFormat().format(value ?? 0);

const getInitials = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

export function ProfileGrid({
  posts,
  isLoading,
  username,
  displayName,
  avatarUrl,
}: ProfileGridProps) {
  const [selectedPost, setSelectedPost] = useState<ProfilePost | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 md:gap-1 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton
            key={`profile-post-skeleton-${index + 1}`}
            className="aspect-square rounded-none"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-border bg-muted/30 text-center">
        <ImageOff className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            No posts yet
          </p>
          <p className="text-sm text-muted-foreground">
            {username} has not shared any feed posts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 md:gap-1 xl:grid-cols-4">
        {posts.map((post) => (
          <ProfileTile
            key={post.id}
            post={post}
            onOpen={setSelectedPost}
          />
        ))}
      </div>

      <Dialog
        open={selectedPost != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPost(null);
          }
        }}
      >
        {selectedPost ? (
          <DialogContent
            showCloseButton={false}
            className="h-[min(94vh,980px)] max-h-[94vh] max-w-[min(96vw,1500px)] rounded-[1.5rem] border-border/70 bg-background p-0 text-foreground md:rounded-[2rem]"
          >
            <div className="grid h-full overflow-hidden lg:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.8fr)]">
              <div className="relative min-h-[45vh] bg-muted lg:min-h-0">
                <Image
                  src={selectedPost.thumbUrl}
                  alt={`Expanded post ${selectedPost.id}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 72vw"
                  priority
                />
              </div>
              <aside className="flex min-h-0 flex-col border-t border-border bg-background lg:border-l lg:border-t-0">
                <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-10 border border-border">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-muted text-foreground">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {username}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {displayName}
                      </p>
                    </div>
                  </div>
                  <DialogClose
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 rounded-full"
                      />
                    }
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">Close</span>
                  </DialogClose>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {selectedPost.mediaType === "video" ? (
                        <>
                          <Clapperboard className="size-4" />
                          <span>Video post</span>
                        </>
                      ) : (
                        <span>Photo post</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Heart className="size-4" />
                          <span>Likes</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {formatMetric(selectedPost.likeCount)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MessageCircleMore className="size-4" />
                          <span>Comments</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {formatMetric(selectedPost.commentCount)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-4">
                      <p className="text-sm leading-6 text-muted-foreground">
                        Post detail data is still thin. This viewer now uses the
                        right layout, but captions, comments, and carousel media
                        need a real post-detail contract instead of fake filler.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
