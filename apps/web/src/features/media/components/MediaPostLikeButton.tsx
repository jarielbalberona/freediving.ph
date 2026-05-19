"use client";

import { useRouter } from "next/navigation";
import { FishSymbol } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { cn } from "@/lib/utils";

import { mediaApi } from "../api/media";

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

const nextLikeState = (current: LikeState): LikeState => {
  const viewerHasLiked = !current.viewerHasLiked;
  return {
    viewerHasLiked,
    likeCount: Math.max(
      0,
      current.likeCount + (viewerHasLiked ? 1 : -1),
    ),
  };
};

const updateMediaPostPayload = (
  payload: Record<string, unknown>,
  state: LikeState,
): Record<string, unknown> => ({
  ...payload,
  likeCount: state.likeCount,
  viewerHasLiked: state.viewerHasLiked,
});

export function MediaPostLikeButton({
  postId,
  likeCount,
  viewerHasLiked,
  className,
}: MediaPostLikeButtonProps) {
  const router = useRouter();
  const session = useSession();
  const queryClient = useQueryClient();

  const applyState = (state: LikeState) => {
    queryClient.setQueriesData({ queryKey: ["media", "profile"] }, (current: any) => {
      if (!current?.pages) return current;
      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          items: (page.items ?? []).map((item: any) =>
            item.postId === postId ? { ...item, ...state } : item,
          ),
        })),
      };
    });

    queryClient.setQueriesData({ queryKey: ["home-feed"] }, (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post" && item.entityId === postId
            ? { ...item, payload: updateMediaPostPayload(item.payload ?? {}, state) }
            : item,
        ),
      };
    });

    queryClient.setQueriesData({ queryKey: ["activity-feed"] }, (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post_created" && item.sourceId === postId
            ? {
                ...item,
                stats: updateMediaPostPayload(item.stats ?? {}, state),
              }
            : item,
        ),
      };
    });

    queryClient.setQueriesData({ queryKey: ["media", "post", postId] }, (current: any) => {
      if (!current?.post?.post) return current;
      return {
        ...current,
        post: {
          ...current.post,
          post: {
            ...current.post.post,
            ...state,
          },
          items: (current.post.items ?? []).map((item: any) => ({
            ...item,
            ...state,
          })),
        },
      };
    });
  };

  const mutation = useMutation({
    mutationFn: async () =>
      viewerHasLiked
        ? mediaApi.unlikeMediaPost(postId)
        : mediaApi.likeMediaPost(postId),
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

  const label = viewerHasLiked ? "Unlike media post" : "Like media post";

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
      <FishSymbol
        className={cn("size-3.5", viewerHasLiked && "fill-current")}
      />
      <span>{likeCount.toLocaleString()}</span>
    </Button>
  );
}
