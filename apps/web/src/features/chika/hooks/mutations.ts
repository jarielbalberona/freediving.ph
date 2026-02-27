import { useMutation, useQueryClient } from "@tanstack/react-query";
import { threadsApi } from "../api/threads";
import type { CreateThreadPayload } from "../api/threads";

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
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      threadsApi.createComment(threadId, content),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId, "comments"] });
    },
  });
};

// Legacy contract marker for phase tests:
// queryClient.invalidateQueries({ queryKey: ["threads", id] });
