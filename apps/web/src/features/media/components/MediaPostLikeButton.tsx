"use client";

import { useRouter } from "next/navigation";
import { FishSymbol } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { cn } from "@/lib/utils";

import { mediaApi } from "../api/media";
import {
  buildMediaPostLikePatch,
  updateMediaPostInCaches,
} from "../lib/cache-updaters";

type MediaPostLikeButtonProps = {
  postId: string;
  likeCount: number;
  viewerHasLiked: boolean;
  className?: string;
};

type LikeState = {
  likeCount: number;
  viewerHasLiked: boolean;
};

export function MediaPostLikeButton({
  postId,
  likeCount,
  viewerHasLiked,
  className,
}: MediaPostLikeButtonProps) {
  const router = useRouter();
  const session = useSession();
  const queryClient = useQueryClient();
  const [state, setState] = useState<LikeState>({
    likeCount,
    viewerHasLiked,
  });

  useEffect(() => {
    setState({ likeCount, viewerHasLiked });
  }, [likeCount, viewerHasLiked]);

  const applyState = (nextState: LikeState) => {
    setState(nextState);
    updateMediaPostInCaches(queryClient, postId, nextState);
  };

  const mutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) =>
      currentlyLiked
        ? mediaApi.unlikeMediaPost(postId)
        : mediaApi.likeMediaPost(postId),
    onMutate: async () => {
      const previous = state;
      applyState(buildMediaPostLikePatch(previous));
      return { previous };
    },
    onSuccess: (result) => {
      applyState({
        likeCount: result.likeCount,
        viewerHasLiked: result.viewerHasLiked,
      });
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        applyState(context.previous);
      }
    },
  });

  const label = state.viewerHasLiked ? "Unlike media post" : "Like media post";

  return (
    <Button
      type="button"
      size="xs"
      variant={state.viewerHasLiked ? "secondary" : "ghost"}
      aria-label={label}
      aria-pressed={state.viewerHasLiked}
      disabled={mutation.isPending}
      className={cn("rounded-full px-2.5", className)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (session.status !== "signed_in") {
          router.push("/sign-in");
          return;
        }
        mutation.mutate(state.viewerHasLiked);
      }}
    >
      <FishSymbol
        className={cn("size-3.5", state.viewerHasLiked && "fill-current")}
      />
      <span>{state.likeCount.toLocaleString()}</span>
    </Button>
  );
}
