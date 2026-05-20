import type { QueryClient } from "@tanstack/react-query";
import type { ChikaThreadView, ThreadReactionType } from "@/features/chika/api/threads";
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
