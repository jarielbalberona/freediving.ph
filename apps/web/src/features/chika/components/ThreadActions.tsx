"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowBigDown, ArrowBigUp, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ThreadReactionType } from "../api/threads";
import { useRemoveThreadReaction, useSetThreadReaction } from "../hooks";

interface ThreadActionsProps {
  threadId: string;
  initialVoteCount: number;
  initialReaction?: ThreadReactionType;
  commentCount?: number;
}

export default function ThreadActions({ threadId, initialVoteCount, initialReaction, commentCount }: ThreadActionsProps) {
  const [reaction, setReaction] = useState<ThreadReactionType | null>(initialReaction ?? null);
  const setReactionMutation = useSetThreadReaction();
  const removeReactionMutation = useRemoveThreadReaction();
  const lockRef = useRef(false);

  const isBusy = setReactionMutation.isPending || removeReactionMutation.isPending || lockRef.current;

  const buttonClass = useMemo(
    () => "h-8 w-8 rounded-full p-0 text-muted-foreground hover:text-foreground",
    [],
  );

  useEffect(() => {
    setReaction(initialReaction ?? null);
  }, [initialReaction]);

  const handleVote = useCallback(async (type: ThreadReactionType) => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      if (reaction === type) {
        await removeReactionMutation.mutateAsync({ threadId });
        setReaction(null);
        return;
      }
      await setReactionMutation.mutateAsync({ threadId, type });
      setReaction(type);
    } finally {
      lockRef.current = false;
    }
  }, [reaction, threadId, setReactionMutation, removeReactionMutation]);

  const handleShare = async () => {
    const target = `${window.location.origin}/chika/${threadId}`;
    try {
      await navigator.clipboard.writeText(target);
      toast.success("Thread link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${buttonClass} h-6 w-6 ${reaction === "upvote" ? "text-primary" : ""}`}
          aria-label="Upvote"
          onClick={() => handleVote("upvote")}
          disabled={isBusy}
        >
          <ArrowBigUp className="h-4 w-4" />
        </Button>
        <span className="min-w-6 text-center text-xs font-semibold text-foreground">
          {initialVoteCount}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${buttonClass} h-6 w-6 ${reaction === "downvote" ? "text-primary" : ""}`}
          aria-label="Downvote"
          onClick={() => handleVote("downvote")}
          disabled={isBusy}
        >
          <ArrowBigDown className="h-4 w-4" />
        </Button>
      </div>
      {typeof commentCount === "number" ? (
        <span className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          {commentCount}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`${buttonClass} h-6 w-6`}
        aria-label="Share"
        onClick={handleShare}
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
