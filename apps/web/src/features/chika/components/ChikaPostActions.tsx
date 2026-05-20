"use client";

import Link from "next/link";
import { Bookmark, Eye, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ThreadReactionType } from "@/features/chika/api/threads";
import { cn } from "@/lib/utils";

import { ChikaVoteControl } from "./ChikaVoteControl";

type ChikaPostActionsProps = {
  threadId: string;
  href: string;
  voteScore: number;
  viewerVote?: ThreadReactionType | null;
  replyCount: number;
  viewerHasSaved?: boolean;
  viewCount?: number;
  showSave?: boolean;
  className?: string;
};

export function ChikaPostActions({
  threadId,
  href,
  voteScore,
  viewerVote,
  replyCount,
  viewerHasSaved = false,
  viewCount,
  showSave = false,
  className,
}: ChikaPostActionsProps) {
  const share = async () => {
    const url = new URL(href, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Chika link copied.");
    } catch {
      toast.error("Unable to copy link.");
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <ChikaVoteControl
        threadId={threadId}
        voteScore={voteScore}
        viewerVote={viewerVote}
      />
      <Button
        size="xs"
        variant="ghost"
        className="rounded-full px-2.5"
        render={<Link href={href} aria-label="View Chika comments" />}
      >
        <MessageCircle className="size-3.5" />
        <span>{replyCount.toLocaleString()}</span>
      </Button>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        aria-label="Share Chika"
        className="rounded-full px-2.5"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void share();
        }}
      >
        <Share2 className="size-3.5" />
      </Button>
      {showSave ? (
        <Button
          type="button"
          size="xs"
          variant={viewerHasSaved ? "secondary" : "ghost"}
          aria-label={viewerHasSaved ? "Unsave Chika" : "Save Chika"}
          aria-pressed={viewerHasSaved}
          className="rounded-full px-2.5"
          disabled
        >
          <Bookmark className={cn("size-3.5", viewerHasSaved && "fill-current")} />
        </Button>
      ) : null}
      {typeof viewCount === "number" ? (
        <span className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted-foreground">
          <Eye className="size-3.5" />
          {viewCount.toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}
