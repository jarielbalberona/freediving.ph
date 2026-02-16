import { axiosInstance } from "@/lib/http/axios";
import { Thread, CreateThreadData, UpdateThreadData, ThreadWithUser } from "../types";

export const threadsApi = {
  // Get all threads
  getAll: async (): Promise<ThreadWithUser[]> => {
    const response = await axiosInstance.get<{ data: ThreadWithUser[] }>("/threads");
    return response.data.data;
  },

  // Get thread by ID
  getById: async (id: number): Promise<Thread> => {
    const response = await axiosInstance.get<{ data: Thread }>(`/threads/${id}`);
    return response.data.data;
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
    await axiosInstance.post(`/threads/${id}/like`);
  },

  // Unlike thread
  unlike: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/threads/${id}/like`);
  },
};
