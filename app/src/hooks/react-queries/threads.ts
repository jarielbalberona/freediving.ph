import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";

export function useThreads(initialThreads?: any) {
  return useQuery({
    queryKey: ["threads"],
    queryFn: () => apiCall("/threads"),
    initialData: initialThreads,
  });
}
