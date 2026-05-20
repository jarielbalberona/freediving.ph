"use client";

import { useRouter } from "next/navigation";
import { FishSymbol } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { queryKeys } from "@/lib/query/query-keys";
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
  const [state, setState] = useState<LikeState>({
    likeCount,
    viewerHasLiked,
  });

  useEffect(() => {
    setState({ likeCount, viewerHasLiked });
  }, [likeCount, viewerHasLiked]);

  const applyState = (nextState: LikeState) => {
    setState(nextState);
    queryClient.setQueriesData({ queryKey: queryKeys.media.profileLists() }, (current: any) => {
      if (!current?.pages) return current;
      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          items: (page.items ?? []).map((item: any) =>
            item.postId === postId ? { ...item, ...nextState } : item,
          ),
        })),
      };
    });

    queryClient.setQueriesData({ queryKey: queryKeys.feed.all }, (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post" && item.entityId === postId
            ? { ...item, payload: updateMediaPostPayload(item.payload ?? {}, nextState) }
            : item,
        ),
      };
    });

    queryClient.setQueriesData({ queryKey: queryKeys.feed.activityAll }, (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post_created" && item.sourceId === postId
            ? {
                ...item,
                stats: updateMediaPostPayload(item.stats ?? {}, nextState),
              }
            : item,
        ),
      };
    });

    queryClient.setQueriesData({ queryKey: queryKeys.media.postDetail(postId) }, (current: any) => {
      if (!current?.post?.post) return current;
      return {
        ...current,
        post: {
          ...current.post,
          post: {
            ...current.post.post,
            ...nextState,
          },
          items: (current.post.items ?? []).map((item: any) => ({
            ...item,
            ...nextState,
          })),
        },
      };
    });
  };

  const mutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) =>
      currentlyLiked
        ? mediaApi.unlikeMediaPost(postId)
        : mediaApi.likeMediaPost(postId),
    onMutate: async () => {
      const previous = state;
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
