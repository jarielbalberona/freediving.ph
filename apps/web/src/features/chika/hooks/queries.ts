import { useQuery } from "@tanstack/react-query";
import { threadsApi } from "../api/threads";
import { ThreadFilters, ThreadWithUser } from '@freediving.ph/types';

export const useThreads = (initialData?: ThreadWithUser[], filters?: ThreadFilters) => {
  return useQuery({
    queryKey: ["threads", filters],
    queryFn: () => threadsApi.getAll(),
    initialData: initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useThread = (id: number) => {
  return useQuery({
    queryKey: ["threads", id],
    queryFn: () => threadsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useThreadComments = (threadId: number) => {
  return useQuery({
    queryKey: ["threads", threadId, "comments"],
    queryFn: () => threadsApi.getComments(threadId),
    enabled: !!threadId,
    staleTime: 2 * 60 * 1000,
  });
};
