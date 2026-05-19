"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import { cn } from "@/lib/utils";

import { MediaPostActions } from "./MediaPostActions";
import { MediaPostComments } from "./MediaPostComments";

type MediaPostSocialPanelProps = {
  postId: string;
  href?: string;
  authorName: string;
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  showAuthorProfileImage?: boolean;
  diveSiteName?: string;
  diveSiteArea?: string;
  diveSiteHref?: string;
  caption: string;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  focusCommentsSignal?: number;
  className?: string;
  commentsClassName?: string;
};

export function MediaPostSocialPanel({
  postId,
  href,
  authorName,
  authorUsername,
  authorAvatarUrl,
  showAuthorProfileImage = true,
  diveSiteName,
  diveSiteArea,
  diveSiteHref,
  caption,
  likeCount,
  commentCount,
  viewerHasLiked,
  viewerHasSaved,
  focusCommentsSignal = 0,
  className,
  commentsClassName,
}: MediaPostSocialPanelProps) {
  const commentsRef = useRef<HTMLDivElement>(null);

  const focusComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const composer = commentsRef.current?.querySelector<HTMLTextAreaElement>(
      "textarea",
    );
    composer?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (focusCommentsSignal > 0) {
      window.requestAnimationFrame(focusComments);
    }
  }, [focusCommentsSignal]);

  const locationText = [diveSiteName, diveSiteArea].filter(Boolean).join(" · ");

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="space-y-4 border-b px-5 py-4">
        <UserIdentityHeader
          displayName={authorName || "Diver"}
          username={authorUsername}
          avatarUrl={authorAvatarUrl}
          showProfileImage={showAuthorProfileImage}
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
        />

        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          {caption || "No caption added."}
        </p>

        <MediaPostActions
          postId={postId}
          href={href}
          likeCount={likeCount}
          commentCount={commentCount}
          viewerHasLiked={viewerHasLiked}
          viewerHasSaved={viewerHasSaved}
          onCommentClick={focusComments}
        />
      </div>

      <div
        ref={commentsRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-5 py-4",
          commentsClassName,
        )}
      >
        <MediaPostComments postId={postId} />
      </div>
    </div>
  );
}
