import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ChikaCommentListResponse,
  ChikaCommentReactionResponse,
  ChikaCommentResponse,
  ChikaReactionType,
  ChikaThreadListResponse,
  ChikaThreadResponse,
  CreateChikaCommentRequest,
  CreateChikaThreadRequest,
} from "@freediving.ph/types";

import {
  createChikaComment,
  createChikaThread,
  removeChikaCommentReaction,
  removeChikaThreadReaction,
  setChikaCommentReaction,
  setChikaThreadReaction,
} from "@/features/chika/api/chika-api";
import { makeIdempotencyKey, makeLocalId } from "@/local/db/types";
import { getMobileAuthTokenSafe } from "@/lib/auth";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const CHIKA_THREAD_LIST_LIMIT = 20;
const chikaThreadListKey = mobileQueryKeys.chika.threadList({
  limit: CHIKA_THREAD_LIST_LIMIT,
});

const patchCommentReaction = (
  comment: ChikaCommentResponse,
  response: ChikaCommentReactionResponse,
) =>
  comment.id === response.commentId
    ? {
        ...comment,
        userReaction: response.userReaction ?? undefined,
        voteCount: response.voteCount,
      }
    : comment;

const voteScore = (value: ChikaReactionType | null | undefined) =>
  value === "upvote" ? 1 : value === "downvote" ? -1 : 0;

const nextVoteCount = (
  currentCount: number,
  currentReaction: ChikaReactionType | null | undefined,
  nextReaction: ChikaReactionType | null,
) => currentCount + voteScore(nextReaction) - voteScore(currentReaction);

const patchThreadReaction = (
  thread: ChikaThreadResponse,
  threadId: string,
  nextReaction: ChikaReactionType | null,
) =>
  thread.id === threadId
    ? {
        ...thread,
        userReaction: nextReaction ?? undefined,
        voteCount: nextVoteCount(
          thread.voteCount,
          thread.userReaction,
          nextReaction,
        ),
      }
    : thread;

const patchCommentReactionState = (
  comment: ChikaCommentResponse,
  commentId: string,
  nextReaction: ChikaReactionType | null,
) =>
  comment.id === commentId
    ? {
        ...comment,
        userReaction: nextReaction ?? undefined,
        voteCount: nextVoteCount(
          comment.voteCount,
          comment.userReaction,
          nextReaction,
        ),
      }
    : comment;

const incrementThreadCommentCount = (
  thread: ChikaThreadResponse,
  threadId: string,
) =>
  thread.id === threadId
    ? { ...thread, commentCount: thread.commentCount + 1 }
    : thread;

const requireMutationTarget = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new FphgoApiError(400, `${label} is unavailable. Try again.`, null);
  }
  return trimmed;
};

const makeOnlineMutationKey = (
  operationType: "chika_comment_reaction" | "chika_thread_reaction",
) => makeIdempotencyKey(operationType, makeLocalId(operationType));

const useRequiredToken = () => {
  const { isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(401, "Checking your session. Try again in a moment.", null);
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    const token = await getMobileAuthTokenSafe();
    if (!token) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    return token;
  };
};

export const useCreateChikaThreadMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateChikaThreadRequest) =>
      createChikaThread(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.chika.threads() });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.feed.all });
    },
  });
};

export const useCreateChikaCommentMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateChikaCommentRequest) =>
      createChikaComment(
        requireMutationTarget(threadId, "Chika thread"),
        payload,
        await getRequiredToken(),
      ),
    onSuccess: (comment) => {
      queryClient.setQueriesData<ChikaThreadListResponse>(
        { queryKey: chikaThreadListKey },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((thread) =>
                  incrementThreadCommentCount(thread, threadId),
                ),
              }
            : current,
      );
      queryClient.setQueriesData<ChikaThreadResponse>(
        { queryKey: mobileQueryKeys.chika.threadDetails() },
        (current) =>
          current ? incrementThreadCommentCount(current, threadId) : current,
      );
      queryClient.setQueriesData<ChikaCommentListResponse>(
        { queryKey: mobileQueryKeys.chika.threadCommentsRoot(threadId) },
        (current) =>
          current
            ? {
                ...current,
                items: comment.parentCommentId
                  ? current.items
                  : [
                      comment,
                      ...current.items.filter((item) => item.id !== comment.id),
                    ],
              }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.chika.threadCommentsRoot(threadId),
      });
    },
  });
};

export const useSetChikaThreadReactionMutation = (threadId: string, slug: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (type: ChikaReactionType | null) => {
      const token = await getRequiredToken();
      const targetThreadId = requireMutationTarget(threadId, "Chika thread");
      const idempotencyKey = makeOnlineMutationKey("chika_thread_reaction");
      return type
        ? setChikaThreadReaction(targetThreadId, type, token, idempotencyKey)
        : removeChikaThreadReaction(targetThreadId, token, idempotencyKey);
    },
    onMutate: async (type) => {
      const targetThreadId = requireMutationTarget(threadId, "Chika thread");
      const threadDetailKey = mobileQueryKeys.chika.threadDetail(slug);
      const threadListKey = chikaThreadListKey;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: threadDetailKey }),
        queryClient.cancelQueries({ queryKey: threadListKey }),
      ]);
      const previousDetail =
        queryClient.getQueryData<ChikaThreadResponse>(threadDetailKey);
      const previousLists = queryClient.getQueriesData<ChikaThreadListResponse>({
        queryKey: threadListKey,
      });

      queryClient.setQueriesData<ChikaThreadResponse>(
        { queryKey: threadDetailKey },
        (current) =>
          current ? patchThreadReaction(current, targetThreadId, type) : current,
      );
      queryClient.setQueriesData<ChikaThreadListResponse>(
        { queryKey: threadListKey },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((thread) =>
                  patchThreadReaction(thread, targetThreadId, type),
                ),
              }
            : current,
      );

      return { previousDetail, previousLists, threadDetailKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.chika.threadDetail(slug),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.chika.threads() });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.feed.all });
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(context.threadDetailKey, context.previousDetail);
      }
      for (const [queryKey, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });
};

export const useSetChikaCommentReactionMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      commentId: string;
      type: ChikaReactionType | null;
    }) => {
      const token = await getRequiredToken();
      const targetCommentId = requireMutationTarget(payload.commentId, "Chika reply");
      const idempotencyKey = makeOnlineMutationKey("chika_comment_reaction");
      return payload.type
        ? setChikaCommentReaction(
            targetCommentId,
            payload.type,
            token,
            idempotencyKey,
          )
        : removeChikaCommentReaction(targetCommentId, token, idempotencyKey);
    },
    onMutate: async ({ commentId, type }) => {
      const commentsKey = mobileQueryKeys.chika.threadCommentsRoot(threadId);
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previousComments =
        queryClient.getQueriesData<ChikaCommentListResponse>({
          queryKey: commentsKey,
        });

      queryClient.setQueriesData<ChikaCommentListResponse>(
        { queryKey: commentsKey },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((comment) =>
                  patchCommentReactionState(comment, commentId, type),
                ),
              }
            : current,
      );

      return { commentsKey, previousComments };
    },
    onSuccess: (response) => {
      queryClient.setQueriesData<ChikaCommentListResponse>(
        { queryKey: mobileQueryKeys.chika.threadCommentsRoot(threadId) },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((comment) =>
                  patchCommentReaction(comment, response),
                ),
              }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.chika.threadCommentsRoot(threadId),
      });
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.previousComments ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });
};
