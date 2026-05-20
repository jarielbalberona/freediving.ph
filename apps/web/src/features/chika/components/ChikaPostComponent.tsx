"use client";

import Link from "next/link";
import { MessageSquareText } from "lucide-react";

import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import { Badge } from "@/components/ui/badge";
import type { ChikaPostDisplay } from "@/features/chika/types/post-display";
import { cn } from "@/lib/utils";

import { ChikaPostActions } from "./ChikaPostActions";

type ChikaPostComponentProps = {
  post: ChikaPostDisplay;
  actions?: React.ReactNode;
  className?: string;
};

function formatElapsedTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return "now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export function ChikaPostComponent({
  post,
  actions,
  className,
}: ChikaPostComponentProps) {
  return (
    <article
      className={cn(
        "relative border-b border-border/70 py-4",
        post.hidden && "border-dashed opacity-60",
        className,
      )}
    >
      <div className="space-y-3">
        <header>
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <UserIdentityHeader
              displayName={post.author.displayName}
              username={post.author.username}
              avatarUrl={post.author.avatarUrl}
              showProfileImage={!post.author.pseudonymous}
              usernameDisabled={post.author.pseudonymous}
              usernameFallback={
                post.author.pseudonymous ? "Pseudonymous" : "Unknown"
              }
              metadata={post.category ? [post.category] : []}
              time={formatElapsedTime(post.createdAt)}
              className="min-w-[12rem] flex-1"
            />
            <div className="flex max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
              <span
                className="inline-flex size-7 items-center justify-center rounded-full bg-teal-500/10 text-teal-800"
                aria-hidden="true"
              >
                <MessageSquareText className="size-3.5" />
              </span>
              <Badge
                variant="outline"
                className="h-6 border-teal-500/30 bg-teal-500/10 px-2 text-teal-800"
              >
                {post.badgeLabel}
              </Badge>
              {post.author.pseudonymous ? (
                <Badge variant="secondary" className="h-6 px-2 text-[10px]">
                  Anon
                </Badge>
              ) : null}
              {post.hidden ? (
                <Badge variant="destructive" className="h-6 px-2 text-[10px]">
                  Hidden
                </Badge>
              ) : null}
            </div>
          </div>
        </header>

        <Link href={post.href} className="block min-w-0">
          <h2 className="truncate text-base font-semibold leading-snug tracking-tight text-foreground hover:underline">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          ) : null}
        </Link>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <ChikaPostActions
          threadId={post.id}
          href={post.href}
          voteScore={post.voteScore}
          viewerVote={post.viewerVote}
          replyCount={post.replyCount}
          viewerHasSaved={post.viewerHasSaved}
          viewCount={post.viewCount}
        />
        {actions}
      </div>
    </article>
  );
}
