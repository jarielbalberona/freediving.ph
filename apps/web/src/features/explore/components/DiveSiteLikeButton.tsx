"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
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

const nextLikeState = (current: LikeState): LikeState => {
  const viewerHasLiked = !current.viewerHasLiked;
  return {
    viewerHasLiked,
    likeCount: Math.max(0, current.likeCount + (viewerHasLiked ? 1 : -1)),
  };
};

const updatePayload = (
  payload: Record<string, unknown>,
  state: LikeState,
) => ({
  ...payload,
  likeCount: state.likeCount,
  viewerHasLiked: state.viewerHasLiked,
});

export function DiveSiteLikeButton({
  siteId,
  likeCount,
  viewerHasLiked,
  className,
}: DiveSiteLikeButtonProps) {
  const router = useRouter();
  const session = useSession();
  const queryClient = useQueryClient();

  const applyState = (state: LikeState) => {
    queryClient.setQueriesData({ queryKey: ["explore"] }, (current: any) => {
      if (!current?.pages) return current;
      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          items: (page.items ?? []).map((item: any) =>
            item.id === siteId ? { ...item, ...state } : item,
          ),
        })),
      };
    });

    queryClient.setQueriesData({ queryKey: ["home-feed"] }, (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "dive_spot" && item.entityId === siteId
            ? { ...item, payload: updatePayload(item.payload ?? {}, state) }
            : item,
        ),
      };
    });
  };

  const mutation = useMutation({
    mutationFn: async () =>
      viewerHasLiked
        ? exploreApi.unlikeDiveSite(siteId)
        : exploreApi.likeDiveSite(siteId),
    onMutate: async () => {
      const previous = { likeCount, viewerHasLiked };
      applyState(nextLikeState(previous));
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

  const label = viewerHasLiked ? "Unlike dive spot" : "Like dive spot";

  return (
    <Button
      type="button"
      size="xs"
      variant={viewerHasLiked ? "secondary" : "ghost"}
      aria-label={label}
      aria-pressed={viewerHasLiked}
      disabled={mutation.isPending}
      className={cn("rounded-full px-2.5", className)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (session.status !== "signed_in") {
          router.push("/sign-in");
          return;
        }
        mutation.mutate();
      }}
    >
      <Heart className={cn("size-3.5", viewerHasLiked && "fill-current")} />
      <span>{likeCount.toLocaleString()}</span>
    </Button>
  );
}
