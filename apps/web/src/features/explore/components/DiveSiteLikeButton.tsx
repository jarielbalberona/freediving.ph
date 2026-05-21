"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import {
  buildDiveSiteLikePatch,
  updateDiveSiteInCaches,
} from "@/features/explore/lib/cache-updaters";
import { cn } from "@/lib/utils";

type DiveSiteLikeButtonProps = {
  siteId: string;
  likeCount: number;
  viewerHasLiked: boolean;
  className?: string;
};

type LikeState = {
  likeCount: number;
  viewerHasLiked: boolean;
};

export function DiveSiteLikeButton({
  siteId,
  likeCount,
  viewerHasLiked,
  className,
}: DiveSiteLikeButtonProps) {
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
    updateDiveSiteInCaches(queryClient, siteId, nextState);
  };

  const mutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) =>
      currentlyLiked
        ? exploreApi.unlikeDiveSite(siteId)
        : exploreApi.likeDiveSite(siteId),
    onMutate: async () => {
      const previous = state;
      applyState(buildDiveSiteLikePatch(previous));
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

  const label = state.viewerHasLiked ? "Unlike dive spot" : "Like dive spot";

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
      <Heart
        className={cn("size-3.5", state.viewerHasLiked && "fill-current")}
      />
      <span>{state.likeCount.toLocaleString()}</span>
    </Button>
  );
}
