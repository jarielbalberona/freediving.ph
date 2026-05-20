import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { queryKeys } from "@/lib/query/query-keys";

export function useDiveSpots(initialDiveSpots?: any) {
  return useQuery({
    queryKey: queryKeys.diveSpots.all,
    queryFn: async () => {
      const response = await apiCall<any[]>("/dive-spots");
      return response.data; // specifically return the data property
    },
    initialData: initialDiveSpots,
  });
}
