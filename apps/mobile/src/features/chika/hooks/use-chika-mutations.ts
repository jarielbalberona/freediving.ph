import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

const useRequiredToken = () => {
  const { getToken } = useAuth();
  return async () => {
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
    mutationFn: async (payload: {
      title: string;
      content: string;
      categoryId: string;
    }) => createChikaThread(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.chika.threads() });
    },
  });
};

export const useCreateChikaCommentMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { content: string; parentCommentId?: string }) =>
      createChikaComment(threadId, payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.chika.threadComments(threadId, { limit: 50 }),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.chika.threads() });
    },
  });
};

export const useSetChikaThreadReactionMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (type: "upvote" | "downvote" | null) => {
      const token = await getRequiredToken();
      return type
        ? setChikaThreadReaction(threadId, type, token)
        : removeChikaThreadReaction(threadId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.chika.threadDetail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.chika.threads() });
    },
  });
};

export const useSetChikaCommentReactionMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      commentId: string;
      type: "upvote" | "downvote" | null;
    }) => {
      const token = await getRequiredToken();
      return payload.type
        ? setChikaCommentReaction(payload.commentId, payload.type, token)
        : removeChikaCommentReaction(payload.commentId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.chika.threadComments(threadId, { limit: 50 }),
      });
    },
  });
};
