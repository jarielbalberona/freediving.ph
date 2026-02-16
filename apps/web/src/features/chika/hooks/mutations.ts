import { useMutation, useQueryClient } from "@tanstack/react-query";
import { threadsApi } from "../api/threads";
import { CreateThreadData, UpdateThreadData } from "../types";

export const useCreateThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateThreadData) => threadsApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch threads
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
};

export const useUpdateThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateThreadData }) =>
      threadsApi.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific thread and threads list
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["threads", id] });
    },
  });
};

export const useDeleteThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => threadsApi.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache and invalidate
      queryClient.removeQueries({ queryKey: ["threads", id] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
};

export const useLikeThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => threadsApi.like(id),
    onSuccess: (_, id) => {
      // Optimistically update the thread
      queryClient.setQueryData(["threads", id], (old: any) => {
        if (old) {
          return {
            ...old,
            likeCount: old.likeCount + 1,
          };
        }
        return old;
      });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
};

export const useUnlikeThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => threadsApi.unlike(id),
    onSuccess: (_, id) => {
      // Optimistically update the thread
      queryClient.setQueryData(["threads", id], (old: any) => {
        if (old) {
          return {
            ...old,
            likeCount: Math.max(0, old.likeCount - 1),
          };
        }
        return old;
      });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
};

// Alias for compatibility with existing code
export const useAddReaction = useLikeThread;
export const useRemoveReaction = useUnlikeThread;

// Placeholder hooks for missing functionality
export const useThreadComments = () => {
  // TODO: Implement comments functionality
  return { data: [], isLoading: false };
};

export const useCreateComment = () => {
  // TODO: Implement comment creation
  return { mutateAsync: async () => {}, isPending: false };
};
