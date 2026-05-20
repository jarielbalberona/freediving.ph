"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { updateChikaThreadInCaches } from "@/features/chika/lib/cache-updaters";
import {
  applyVoteTransition,
  nextVoteForClick,
  type ChikaVoteState,
} from "@/features/chika/lib/vote-state";
import { cn } from "@/lib/utils";

import { threadsApi, type ThreadReactionType } from "../api/threads";

type ChikaVoteControlProps = {
  threadId: string;
  voteScore: number;
  viewerVote?: ThreadReactionType | null;
  className?: string;
};

type VoteMutationVariables = {
  clicked: ThreadReactionType;
  nextVote: ThreadReactionType | null;
};

export function ChikaVoteControl({
  threadId,
  voteScore,
  viewerVote,
  className,
}: ChikaVoteControlProps) {
  const router = useRouter();
  const session = useSession();
  const queryClient = useQueryClient();
  const [state, setState] = useState<ChikaVoteState>({
    voteScore,
    viewerVote: viewerVote ?? null,
  });

  useEffect(() => {
    setState({ voteScore, viewerVote: viewerVote ?? null });
  }, [voteScore, viewerVote]);

  const applyState = (nextState: ChikaVoteState) => {
    setState(nextState);
    updateChikaThreadInCaches(queryClient, threadId, {
      voteCount: nextState.voteScore,
      userReaction: nextState.viewerVote,
    });
  };

  const mutation = useMutation({
    mutationFn: async ({ nextVote }: VoteMutationVariables) => {
      if (nextVote) {
        await threadsApi.setReaction(threadId, nextVote);
        return nextVote;
      }
      await threadsApi.removeReaction(threadId);
      return null;
    },
    onMutate: async ({ clicked }: VoteMutationVariables) => {
      const previous = state;
      const nextState = applyVoteTransition(previous, clicked);
      applyState(nextState);
      return { nextState, previous };
    },
    onSuccess: (_result, _variables, context) => {
      if (context?.nextState) applyState(context.nextState);
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) applyState(context.previous);
    },
  });

  const handleVote = (clicked: ThreadReactionType) => {
    if (session.status !== "signed_in") {
      router.push("/sign-in");
      return;
    }
    mutation.mutate({ clicked, nextVote: nextVoteForClick(state.viewerVote, clicked) });
  };

  const buttonClass =
    "h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-foreground";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-1 py-0.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, state.viewerVote === "upvote" && "text-primary")}
        aria-label="Upvote"
        aria-pressed={state.viewerVote === "upvote"}
        onClick={() => handleVote("upvote")}
        disabled={mutation.isPending}
      >
        <ArrowBigUp className="h-4 w-4" />
      </Button>
      <span className="min-w-6 text-center text-xs font-semibold text-foreground">
        {state.voteScore.toLocaleString()}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          buttonClass,
          state.viewerVote === "downvote" && "text-primary",
        )}
        aria-label="Downvote"
        aria-pressed={state.viewerVote === "downvote"}
        onClick={() => handleVote("downvote")}
        disabled={mutation.isPending}
      >
        <ArrowBigDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
