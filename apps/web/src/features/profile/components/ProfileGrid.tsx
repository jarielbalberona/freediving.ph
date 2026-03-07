"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Clapperboard,
  Heart,
  ImageOff,
  MessageCircleMore,
  Send,
  XIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileTile } from "@/features/profile/components/ProfileTile";
import type { ProfilePost } from "@/features/profile/types";
import { Card } from "@/components/ui/card";

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
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
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
          <ProfileTile key={post.id} post={post} onOpen={setSelectedPost} />
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
            containerClassName="p-0"
            showCloseButton={false}
            className="relative h-dvh max-h-dvh max-w-none w-full rounded-none border-0 bg-background p-0 text-foreground shadow-none ring-0 md:max-w-max"
          >
            <div className="hidden md:block absolute right-2 top-2 z-20">
              <DialogClose
                render={
                  <Button
                    variant="default"
                    size="icon"
                  />
                }
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
            <div className="flex flex-col md:flex-row md:h-dvh md:overflow-hidden">
              <div className="relative bg-muted md:flex md:min-w-0 md:flex-1  md:overflow-hidden">
                <div className="relative aspect-[4/5] h-auto w-full max-w-full md:max-h-full md:w-auto overflow-hidden">
                  <Image
                    src={selectedPost.thumbUrl || "/images/samples/1.jpg"}
                    alt={`Expanded post ${selectedPost.id}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 767px) 100vw, 70vw"
                    priority
                  />
                </div>
                <div className="block md:hidden">
                  <DialogClose
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-4 top-4 z-20 bg-background/50"
                      />
                    }
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">Close</span>
                  </DialogClose>
                </div>
              </div>

              <aside className="flex min-h-0 flex-shrink-0 flex-col border-t border-border bg-background md:w-96 md:border-l md:border-t-0">
                <div className="flex items-center gap-3 px-4 py-3 md:px-5">
                  <Avatar className="size-9 border border-border">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-muted text-foreground">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayName}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-3 md:px-5">
                  <div className="flex items-center gap-5 text-foreground">
                    <div className="flex items-center gap-2">
                      <Heart className="size-7" />
                      <span className="text-sm font-semibold">
                        {formatMetric(selectedPost.likeCount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircleMore className="size-7" />
                      <span className="text-sm font-semibold">
                        {formatMetric(selectedPost.commentCount)}
                      </span>
                    </div>
                    <Send className="size-7" />
                    {selectedPost.mediaType === "video" ? (
                      <Clapperboard className="ml-auto size-5 text-muted-foreground" />
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1 px-4 pb-5 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-5">
                  <p className="text-sm leading-6 text-foreground">
                    <span className="mr-1 font-semibold">{username}</span>
                    {selectedPost.caption || "No dive notes added."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPost.siteName} · {selectedPost.siteArea}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    View all {formatMetric(selectedPost.commentCount)} comments
                  </p>
                </div>
              </aside>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
