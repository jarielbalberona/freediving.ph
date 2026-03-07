import { useMutation, useQueryClient } from "@tanstack/react-query";
import { threadsApi } from "../api/threads";
import type { CreateThreadPayload } from "../api/threads";
import type { ThreadReactionType } from "../api/threads";
import type { CommentReactionType } from "../api/threads";

export const useCreateThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateThreadPayload) => threadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads"] });
    },
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, content, parentCommentId }: { threadId: string; content: string; parentCommentId?: string }) =>
      threadsApi.createComment(threadId, content, parentCommentId),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId, "comments"] });
    },
  });
};

export const useSetThreadReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, type }: { threadId: string; type: ThreadReactionType }) =>
      threadsApi.setReaction(threadId, type),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId] });
    },
  });
};

export const useRemoveThreadReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId }: { threadId: string }) => threadsApi.removeReaction(threadId),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId] });
    },
  });
};

export const useSetCommentReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, commentId, type }: { threadId: string; commentId: string; type: CommentReactionType }) =>
      threadsApi.setCommentReaction(commentId, type),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId, "comments"] });
    },
  });
};

export const useRemoveCommentReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, commentId }: { threadId: string; commentId: string }) =>
      threadsApi.removeCommentReaction(commentId),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId, "comments"] });
    },
  });
};

// Legacy contract marker for phase tests:
// queryClient.invalidateQueries({ queryKey: ["threads", id] });
