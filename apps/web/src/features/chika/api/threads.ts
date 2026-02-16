import { axiosInstance } from "@/lib/http/axios";
import { Thread, CreateThreadData, UpdateThreadData, ThreadWithUser } from "../types";
import type { ApiEnvelope } from "@freediving.ph/types";

interface ThreadComment {
  comment: {
    id: number;
    content: string;
    createdAt: string;
  };
  user: {
    id: number;
    username: string;
    alias: string | null;
  };
}

export const threadsApi = {
  // Get all threads
  getAll: async (): Promise<ThreadWithUser[]> => {
    const response = await axiosInstance.get<ApiEnvelope<ThreadWithUser[]>>("/threads");
    return response.data.data;
  },

  // Get thread by ID
  getById: async (id: number): Promise<ThreadWithUser> => {
    const response = await axiosInstance.get<ApiEnvelope<any>>(`/threads/${id}`);
    const data = response.data.data;

    if (data.thread && data.user) {
      return {
        thread: data.thread,
        user: data.user,
        commentCount: data.commentCount ?? 0,
        upvotes: data.upvotes ?? 0,
        downvotes: data.downvotes ?? 0,
      } as ThreadWithUser;
    }

    return {
      thread: data as Thread,
      user: {
        id: data.user?.id ?? 0,
        username: data.user?.username ?? "unknown",
        alias: data.user?.alias ?? "",
      },
      commentCount: data.commentCount ?? 0,
      upvotes: data.upvotes ?? 0,
      downvotes: data.downvotes ?? 0,
    };
  },

  // Create new thread
  create: async (data: CreateThreadData): Promise<Thread> => {
    const response = await axiosInstance.post<{ data: Thread }>("/threads", data);
    return response.data.data;
  },

  // Update thread
  update: async (id: number, data: UpdateThreadData): Promise<Thread> => {
    const response = await axiosInstance.put<{ data: Thread }>(`/threads/${id}`, data);
    return response.data.data;
  },

  // Delete thread
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/threads/${id}`);
  },

  // Like thread
  like: async (id: number): Promise<void> => {
    await axiosInstance.post(`/threads/${id}/reactions`, { type: "1" });
  },

  // Unlike thread
  unlike: async (id: number): Promise<void> => {
    await axiosInstance.post(`/threads/${id}/reactions`, { type: "0" });
  },

  removeReaction: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/threads/${id}/reactions`);
  },

  getComments: async (threadId: number): Promise<ThreadComment[]> => {
    const response = await axiosInstance.get<ApiEnvelope<ThreadComment[]>>(`/threads/${threadId}/comments`);
    return response.data.data;
  },

  createComment: async (threadId: number, content: string): Promise<void> => {
    await axiosInstance.post(`/threads/${threadId}/comments`, {
      threadId,
      content,
    });
  },
};
