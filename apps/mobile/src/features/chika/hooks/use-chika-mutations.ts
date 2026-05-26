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
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

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

const useRequiredToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(401, "Checking your session. Try again in a moment.", null);
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    const token = await getToken();
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
        { queryKey: mobileQueryKeys.chika.threads() },
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
      return type
        ? setChikaThreadReaction(targetThreadId, type, token)
        : removeChikaThreadReaction(targetThreadId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.chika.threadDetail(slug),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.chika.threads() });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.feed.all });
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
      return payload.type
        ? setChikaCommentReaction(targetCommentId, payload.type, token)
        : removeChikaCommentReaction(targetCommentId, token);
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
  });
};
