import type { QueryClient } from "@tanstack/react-query";
import type {
  ChikaCommentView,
  ChikaThreadView,
  CommentReactionType,
  ThreadReactionType,
} from "@/features/chika/api/threads";
import { voteDelta } from "@/features/chika/lib/vote-state";
import { queryKeys } from "@/lib/query/query-keys";

type ChikaPatch = {
  voteCount?: number;
  userReaction?: ThreadReactionType | null;
  commentCount?: number;
};

const patchThread = (thread: ChikaThreadView, patch: ChikaPatch) => ({
  ...thread,
  ...(patch.voteCount !== undefined ? { voteCount: patch.voteCount } : null),
  ...(patch.commentCount !== undefined ? { commentCount: patch.commentCount } : null),
  userReaction:
    patch.userReaction === undefined
      ? thread.userReaction
      : (patch.userReaction ?? undefined),
});

const patchFeedPayload = (
  payload: Record<string, unknown> | undefined,
  patch: ChikaPatch,
) => ({
  ...(payload ?? {}),
  ...(patch.voteCount !== undefined ? { reactionCount: patch.voteCount } : null),
  ...(patch.commentCount !== undefined ? { replyCount: patch.commentCount } : null),
  ...(patch.userReaction !== undefined ? { viewerVote: patch.userReaction } : null),
});

const patchActivityStats = (
  stats: Record<string, unknown> | undefined,
  patch: ChikaPatch,
) => ({
  ...(stats ?? {}),
  ...(patch.voteCount !== undefined
    ? { reactionCount: patch.voteCount, reactions: patch.voteCount }
    : null),
  ...(patch.commentCount !== undefined
    ? { replyCount: patch.commentCount, replies: patch.commentCount }
    : null),
  ...(patch.userReaction !== undefined ? { viewerVote: patch.userReaction } : null),
});

const countWithDelta = (value: unknown, delta: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value + delta)
    : undefined;

type ChikaCommentPatch = {
  voteCount?: number;
  userReaction?: CommentReactionType | null;
};

const patchComment = (
  comment: ChikaCommentView,
  patch: ChikaCommentPatch,
): ChikaCommentView => ({
  ...comment,
  ...(patch.voteCount !== undefined ? { voteCount: patch.voteCount } : null),
  userReaction:
    patch.userReaction === undefined
      ? comment.userReaction
      : (patch.userReaction ?? undefined),
});

export function buildChikaCommentReactionPatch(
  comment: ChikaCommentView,
  nextReaction: CommentReactionType | null,
): Required<ChikaCommentPatch> {
  const currentReaction = comment.userReaction ?? null;
  return {
    voteCount: comment.voteCount + voteDelta(currentReaction, nextReaction),
    userReaction: nextReaction,
  };
}

export function patchChikaCommentList(
  current: ChikaCommentView[] | undefined,
  commentId: string,
  patch: ChikaCommentPatch,
) {
  if (!Array.isArray(current)) return current;
  return current.map((comment) =>
    comment.id === commentId ? patchComment(comment, patch) : comment,
  );
}

export function getChikaCommentFromCache(
  queryClient: QueryClient,
  threadId: string,
  commentId: string,
) {
  const current = queryClient.getQueryData<ChikaCommentView[]>(
    queryKeys.chika.threadComments(threadId),
  );
  return Array.isArray(current)
    ? current.find((comment) => comment.id === commentId)
    : undefined;
}

export function updateChikaCommentInCache(
  queryClient: QueryClient,
  threadId: string,
  commentId: string,
  patch: ChikaCommentPatch,
) {
  queryClient.setQueryData(
    queryKeys.chika.threadComments(threadId),
    (current: ChikaCommentView[] | undefined) =>
      patchChikaCommentList(current, commentId, patch),
  );
}

export function updateChikaThreadInCaches(
  queryClient: QueryClient,
  threadId: string,
  patch: ChikaPatch,
) {
  queryClient.setQueriesData(
    { queryKey: queryKeys.chika.threads() },
    (current: unknown) => {
      if (Array.isArray(current)) {
        return current.map((thread) =>
          thread?.id === threadId ? patchThread(thread, patch) : thread,
        );
      }
      const detail = current as ChikaThreadView | undefined;
      if (detail?.id === threadId) return patchThread(detail, patch);
      return current;
    },
  );

  queryClient.setQueriesData({ queryKey: queryKeys.feed.all }, (current: any) => {
    if (!current?.items) return current;
    return {
      ...current,
      items: current.items.map((item: any) =>
        item.type === "community_hot_post" && item.entityId === threadId
          ? { ...item, payload: patchFeedPayload(item.payload, patch) }
          : item,
      ),
    };
  });

  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.activityAll },
    (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "chika_thread_created" &&
          (item.target?.id === threadId || item.sourceId === threadId)
            ? { ...item, stats: patchActivityStats(item.stats, patch) }
            : item,
        ),
      };
    },
  );
}

export function updateChikaThreadCommentCountDelta(
  queryClient: QueryClient,
  threadId: string,
  delta: number,
) {
  queryClient.setQueriesData(
    { queryKey: queryKeys.chika.threads() },
    (current: unknown) => {
      if (Array.isArray(current)) {
        return current.map((thread) => {
          if (thread?.id !== threadId) return thread;
          const commentCount = countWithDelta(thread.commentCount, delta);
          return commentCount === undefined
            ? thread
            : patchThread(thread, { commentCount });
        });
      }

      const detail = current as ChikaThreadView | undefined;
      if (detail?.id !== threadId) return current;
      const commentCount = countWithDelta(detail.commentCount, delta);
      return commentCount === undefined
        ? current
        : patchThread(detail, { commentCount });
    },
  );

  queryClient.setQueriesData({ queryKey: queryKeys.feed.all }, (current: any) => {
    if (!current?.items) return current;
    return {
      ...current,
      items: current.items.map((item: any) => {
        if (item.type !== "community_hot_post" || item.entityId !== threadId) {
          return item;
        }
        const replyCount = countWithDelta(item.payload?.replyCount, delta);
        return replyCount === undefined
          ? item
          : {
              ...item,
              payload: patchFeedPayload(item.payload, { commentCount: replyCount }),
            };
      }),
    };
  });

  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.activityAll },
    (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) => {
          if (
            item.type !== "chika_thread_created" ||
            (item.target?.id !== threadId && item.sourceId !== threadId)
          ) {
            return item;
          }
          const replyCount =
            countWithDelta(item.stats?.replyCount, delta) ??
            countWithDelta(item.stats?.replies, delta);
          return replyCount === undefined
            ? item
            : {
                ...item,
                stats: patchActivityStats(item.stats, {
                  commentCount: replyCount,
                }),
              };
        }),
      };
    },
  );
}
