import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildChikaCommentReactionPatch,
  getChikaCommentFromCache,
  updateChikaCommentInCache,
  updateChikaThreadCommentCountDelta,
} from "@/features/chika/lib/cache-updaters";
import { queryKeys } from "@/lib/query/query-keys";
import { trackProductEvent } from "@/lib/analytics/product-events";
import { threadsApi } from "../api/threads";
import type { CreateThreadPayload } from "../api/threads";
import type { ThreadReactionType } from "../api/threads";
import type { CommentReactionType } from "../api/threads";

export const useCreateThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateThreadPayload) => threadsApi.create(data),
    onSuccess: () => {
      trackProductEvent("chika_thread_created");
      queryClient.invalidateQueries({ queryKey: queryKeys.chika.threads() });
    },
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threadId,
      content,
      parentCommentId,
    }: { threadId: string; content: string; parentCommentId?: string }) =>
      threadsApi.createComment(threadId, content, parentCommentId),
    onSuccess: (_, { threadId }) => {
      updateChikaThreadCommentCountDelta(queryClient, threadId, 1);
      queryClient.invalidateQueries({
        queryKey: queryKeys.chika.threadComments(threadId),
      });
    },
  });
};

export const useSetThreadReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threadId,
      type,
    }: { threadId: string; type: ThreadReactionType }) =>
      threadsApi.setReaction(threadId, type),
  });
};

export const useRemoveThreadReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId }: { threadId: string }) =>
      threadsApi.removeReaction(threadId),
  });
};

export const useSetCommentReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      type,
    }: { threadId: string; commentId: string; type: CommentReactionType }) =>
      threadsApi.setCommentReaction(commentId, type),
    onMutate: async ({ threadId, commentId, type }) => {
      const queryKey = queryKeys.chika.threadComments(threadId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const comment = getChikaCommentFromCache(
        queryClient,
        threadId,
        commentId,
      );
      if (comment) {
        updateChikaCommentInCache(
          queryClient,
          threadId,
          commentId,
          buildChikaCommentReactionPatch(comment, type),
        );
      }
      return { previous, queryKey };
    },
    onSuccess: (result) => {
      updateChikaCommentInCache(
        queryClient,
        result.threadId,
        result.commentId,
        {
          voteCount: result.voteCount,
          userReaction: result.userReaction,
        },
      );
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_result, _error, { threadId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chika.threadComments(threadId),
      });
    },
  });
};

export const useRemoveCommentReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { threadId: string; commentId: string }) =>
      threadsApi.removeCommentReaction(commentId),
    onMutate: async ({ threadId, commentId }) => {
      const queryKey = queryKeys.chika.threadComments(threadId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const comment = getChikaCommentFromCache(
        queryClient,
        threadId,
        commentId,
      );
      if (comment) {
        updateChikaCommentInCache(
          queryClient,
          threadId,
          commentId,
          buildChikaCommentReactionPatch(comment, null),
        );
      }
      return { previous, queryKey };
    },
    onSuccess: (result) => {
      updateChikaCommentInCache(
        queryClient,
        result.threadId,
        result.commentId,
        {
          voteCount: result.voteCount,
          userReaction: result.userReaction,
        },
      );
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_result, _error, { threadId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chika.threadComments(threadId),
      });
    },
  });
};
