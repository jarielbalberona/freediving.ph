"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, MessageCircle, Share2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { cn } from "@/lib/utils";

import { mediaApi } from "../api/media";
import { MediaPostLikeButton } from "./MediaPostLikeButton";

type MediaPostActionsProps = {
  postId: string;
  href?: string;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  onCommentClick?: () => void;
  showSave?: boolean;
  className?: string;
};

type SaveState = {
  viewerHasSaved: boolean;
};

const updatePayload = (
  payload: Record<string, unknown>,
  state: SaveState,
): Record<string, unknown> => ({
  ...payload,
  viewerHasSaved: state.viewerHasSaved,
});

export function MediaPostActions({
  postId,
  href,
  likeCount,
  commentCount,
  viewerHasLiked,
  viewerHasSaved,
  onCommentClick,
  showSave = true,
  className,
}: MediaPostActionsProps) {
  const router = useRouter();
  const session = useSession();
  const queryClient = useQueryClient();
  const postHref = href || "#";

  const applySaveState = (state: SaveState) => {
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
            ? { ...item, payload: updatePayload(item.payload ?? {}, state) }
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
            ? { ...item, stats: updatePayload(item.stats ?? {}, state) }
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
          post: { ...current.post.post, ...state },
          items: (current.post.items ?? []).map((item: any) => ({
            ...item,
            ...state,
          })),
        },
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () =>
      viewerHasSaved
        ? mediaApi.unsaveMediaPost(postId)
        : mediaApi.saveMediaPost(postId),
    onMutate: async () => {
      const previous = { viewerHasSaved };
      applySaveState({ viewerHasSaved: !viewerHasSaved });
      return { previous };
    },
    onSuccess: (result) => {
      applySaveState({ viewerHasSaved: result.viewerHasSaved });
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) applySaveState(context.previous);
    },
  });

  const share = async () => {
    const url = new URL(postHref, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <MediaPostLikeButton
        postId={postId}
        likeCount={likeCount}
        viewerHasLiked={viewerHasLiked}
      />
      <Button
        size="xs"
        variant="ghost"
        className="rounded-full px-2.5"
        render={
          onCommentClick
            ? undefined
            : <Link href={postHref} aria-label="View media post comments" />
        }
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (onCommentClick) {
            onCommentClick();
            return;
          }
          router.push(postHref);
        }}
      >
        <MessageCircle className="size-3.5" />
        <span>{commentCount.toLocaleString()}</span>
      </Button>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        aria-label="Share media post"
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
          aria-label={viewerHasSaved ? "Unsave media post" : "Save media post"}
          aria-pressed={viewerHasSaved}
          disabled={saveMutation.isPending}
          className="rounded-full px-2.5"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (session.status !== "signed_in") {
              router.push("/sign-in");
              return;
            }
            saveMutation.mutate();
          }}
        >
          <Bookmark className={cn("size-3.5", viewerHasSaved && "fill-current")} />
        </Button>
      ) : null}
    </div>
  );
}
