import { useQuery } from "@tanstack/react-query";
import { threadsApi } from "../api/threads";
import type { ChikaThreadView } from "../api/threads";

export const useThreads = (initialData?: ChikaThreadView[], category?: string) => {
  return useQuery({
    queryKey: ["chika", "threads", category],
    queryFn: () => threadsApi.getAll(category),
    initialData: initialData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useThread = (id: string) => {
  return useQuery({
    queryKey: ["chika", "threads", id],
    queryFn: () => threadsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useThreadComments = (threadId: string) => {
  return useQuery({
    queryKey: ["chika", "threads", threadId, "comments"],
    queryFn: () => threadsApi.getComments(threadId),
    enabled: !!threadId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useChikaCategories = () => {
  return useQuery({
    queryKey: ["chika", "categories"],
    queryFn: () => threadsApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
};
