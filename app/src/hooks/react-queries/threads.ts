import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/http";

// Types
export interface Thread {
  id: number;
  userId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  alias: string;
}

export interface ThreadWithUser {
  thread: Thread;
  user: User;
  commentCount: number;
  upvotes: number;
  downvotes: number;
}

export interface Comment {
  id: number;
  userId: number;
  threadId: number;
  parentId?: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithUser {
  comment: Comment;
  user: User;
}

export interface CreateThreadData {
  title: string;
  content: string;
}

export interface CreateCommentData {
  threadId: number;
  parentId?: number;
  content: string;
}

export interface ReactionData {
  type: "1" | "0"; // "1" for like, "0" for dislike
}

// Query keys
export const threadsKeys = {
  all: ['threads'] as const,
  lists: () => [...threadsKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...threadsKeys.lists(), { filters }] as const,
  details: () => [...threadsKeys.all, 'detail'] as const,
  detail: (id: number) => [...threadsKeys.details(), id] as const,
  comments: (threadId: number) => [...threadsKeys.all, 'comments', threadId] as const,
};

// Hooks
export function useThreads(initialData?: ThreadWithUser[]) {
  return useQuery({
    queryKey: threadsKeys.lists(),
    queryFn: async (): Promise<ThreadWithUser[]> => {
      const response = await http.get<{ data: ThreadWithUser[] }>('/threads');
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useThread(id: number) {
  return useQuery({
    queryKey: threadsKeys.detail(id),
    queryFn: async (): Promise<ThreadWithUser> => {
      const response = await http.get<{ data: ThreadWithUser }>(`/threads/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useThreadComments(threadId: number) {
  return useQuery({
    queryKey: threadsKeys.comments(threadId),
    queryFn: async (): Promise<CommentWithUser[]> => {
      const response = await http.get<{ data: CommentWithUser[] }>(`/threads/${threadId}/comments`);
      return response.data;
    },
    enabled: !!threadId,
  });
}

// Mutations
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateThreadData) => {
      const response = await http.post<{ data: Thread }>('/threads', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadsKeys.lists() });
    },
  });
}

export function useUpdateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateThreadData> }) => {
      const response = await http.put<{ data: Thread }>(`/threads/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: threadsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: threadsKeys.detail(variables.id) });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCommentData) => {
      const response = await http.post<{ data: Comment }>(`/threads/${data.threadId}/comments`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: threadsKeys.comments(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: threadsKeys.detail(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: threadsKeys.lists() });
    },
  });
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, data }: { threadId: number; data: ReactionData }) => {
      const response = await http.post<{ data: any }>(`/threads/${threadId}/reactions`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: threadsKeys.detail(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: threadsKeys.lists() });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, userId }: { threadId: number; userId: number }) => {
      const response = await http.delete<{ data: any }>(`/threads/${threadId}/reactions`, {
        data: { userId }
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: threadsKeys.detail(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: threadsKeys.lists() });
    },
  });
}
