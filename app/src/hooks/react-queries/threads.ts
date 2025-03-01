import { useQuery } from "@tanstack/react-query";
import { appAPICall } from "@/lib/api";

export function useThreads(initialThreads?: any) {
  return useQuery({
    queryKey: ["threads"],
    queryFn: () => appAPICall("/threads"),
    initialData: initialThreads,
  });
}
