import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";

export function useThreads(initialThreads?: any) {
  return useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const response = await apiCall<any[]>("/threads");
      return response.data; // specifically return the data property
    },
    initialData: initialThreads,
  });
}
