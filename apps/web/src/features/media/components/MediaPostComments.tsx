"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, LoaderCircle, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MediaPostComment,
  MediaPostCommentListResponse,
} from "@freediving.ph/types";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UsernameLink } from "@/components/common/UsernameLink";
import { useSession } from "@/features/auth/session";
import { cn } from "@/lib/utils";

import { mediaApi } from "../api/media";
import { useMediaPostCommentsInfiniteQuery } from "../hooks";

type MediaPostCommentsProps = {
  postId: string;
};

const patchComment = (
  current: unknown,
  commentId: string,
  patch: Partial<MediaPostComment>,
) => {
  const data = current as { pages?: MediaPostCommentListResponse[] } | undefined;
  if (!data?.pages) return current;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((comment) =>
        comment.id === commentId ? { ...comment, ...patch } : comment,
      ),
    })),
  };
};

export function MediaPostComments({ postId }: MediaPostCommentsProps) {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const commentsQuery = useMediaPostCommentsInfiniteQuery(postId);
  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [commentsQuery.data?.pages],
  );
  const commentsKey = ["media", "post", postId, "comments", 20] as const;

  const applyCommentCountDelta = (delta: number) => {
    const updateCount = (value: unknown) =>
      Math.max(0, Number(value ?? 0) + delta);

    queryClient.setQueriesData({ queryKey: ["media", "profile"] }, (current: any) => {
      if (!current?.pages) return current;
      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          items: (page.items ?? []).map((item: any) =>
            item.postId === postId
              ? { ...item, commentCount: updateCount(item.commentCount) }
              : item,
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
            ? {
                ...item,
                payload: {
                  ...(item.payload ?? {}),
                  commentCount: updateCount(item.payload?.commentCount),
                },
              }
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
                stats: {
                  ...(item.stats ?? {}),
                  commentCount: updateCount(item.stats?.commentCount),
                },
              }
            : item,
        ),
      };
    });

    queryClient.setQueriesData({ queryKey: ["media", "post", postId] }, (current: any) => {
      if (!current?.post?.post) return current;
      const commentCount = updateCount(current.post.post.commentCount);
      return {
        ...current,
        post: {
          ...current.post,
          post: { ...current.post.post, commentCount },
          items: (current.post.items ?? []).map((item: any) => ({
            ...item,
            commentCount,
          })),
        },
      };
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => mediaApi.createPostComment(postId, body),
    onSuccess: (comment) => {
      setBody("");
      queryClient.setQueryData(commentsKey, (current: any) => {
        if (!current?.pages?.length) {
          return {
            pages: [{ items: [comment] }],
            pageParams: [undefined],
          };
        }
        return {
          ...current,
          pages: current.pages.map((page: MediaPostCommentListResponse, index: number) =>
            index === 0 ? { ...page, items: [comment, ...page.items] } : page,
          ),
        };
      });
      applyCommentCountDelta(1);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) =>
      mediaApi.deletePostComment(postId, commentId),
    onSuccess: (_result, commentId) => {
      queryClient.setQueryData(commentsKey, (current: any) => {
        if (!current?.pages) return current;
        return {
          ...current,
          pages: current.pages.map((page: MediaPostCommentListResponse) => ({
            ...page,
            items: page.items.filter((comment) => comment.id !== commentId),
          })),
        };
      });
      applyCommentCountDelta(-1);
    },
  });

  const toggleCommentLike = useMutation({
    mutationFn: async (comment: MediaPostComment) =>
      comment.viewerHasLiked
        ? mediaApi.unlikeMediaPostComment(postId, comment.id)
        : mediaApi.likeMediaPostComment(postId, comment.id),
    onMutate: async (comment) => {
      const previous = commentsQuery.data;
      queryClient.setQueryData(
        commentsKey,
        patchComment(commentsQuery.data, comment.id, {
          viewerHasLiked: !comment.viewerHasLiked,
          likeCount: Math.max(
            0,
            comment.likeCount + (comment.viewerHasLiked ? -1 : 1),
          ),
        }),
      );
      return { previous };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        commentsKey,
        patchComment(commentsQuery.data, result.commentId, {
          likeCount: result.likeCount,
          viewerHasLiked: result.viewerHasLiked,
        }),
      );
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(commentsKey, context.previous);
    },
  });

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            session.status === "signed_in"
              ? "Add a comment"
              : "Sign in to comment"
          }
          disabled={session.status !== "signed_in" || createMutation.isPending}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={
              session.status !== "signed_in" ||
              createMutation.isPending ||
              body.trim().length === 0
            }
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Comment
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <article key={comment.id} className="space-y-2 border-t pt-4">
            <div className="flex items-start gap-3">
              <UserAvatar
                displayName={comment.author.displayName}
                src={comment.author.avatarUrl ?? undefined}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {comment.author.displayName}
                  </p>
                  <UsernameLink
                    username={comment.author.username}
                    className="text-xs text-muted-foreground"
                  />
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {comment.body}
                </p>
              </div>
            </div>
            <div className="ml-10 flex items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant={comment.viewerHasLiked ? "secondary" : "ghost"}
                aria-label={
                  comment.viewerHasLiked
                    ? "Unlike media post comment"
                    : "Like media post comment"
                }
                aria-pressed={comment.viewerHasLiked}
                disabled={toggleCommentLike.isPending}
                className="rounded-full px-2.5"
                onClick={() => {
                  if (session.status !== "signed_in") {
                    router.push("/sign-in");
                    return;
                  }
                  toggleCommentLike.mutate(comment);
                }}
              >
                <Heart
                  className={cn(
                    "size-3.5",
                    comment.viewerHasLiked && "fill-current",
                  )}
                />
                <span>{comment.likeCount.toLocaleString()}</span>
              </Button>
              {session.me?.userId === comment.author.id ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Delete media post comment"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(comment.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {commentsQuery.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={commentsQuery.isFetchingNextPage}
          onClick={() => commentsQuery.fetchNextPage()}
        >
          Load more comments
        </Button>
      ) : null}
    </section>
  );
}
