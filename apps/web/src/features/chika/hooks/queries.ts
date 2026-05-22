import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { threadsApi } from "../api/threads";
import type { ChikaThreadView } from "../api/threads";

export const useThreads = (initialData?: ChikaThreadView[], category?: string) => {
  return useQuery({
    queryKey: queryKeys.chika.threadList(category),
    queryFn: () => threadsApi.getAll(category),
    initialData: initialData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useThread = (slug: string) => {
  return useQuery({
    queryKey: queryKeys.chika.thread(slug),
    queryFn: () => threadsApi.getBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

export const useThreadComments = (threadId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.chika.threadComments(threadId),
    queryFn: () => threadsApi.getComments(threadId),
    enabled: enabled && !!threadId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useChikaCategories = () => {
  return useQuery({
    queryKey: queryKeys.chika.categories(),
    queryFn: () => threadsApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
};
