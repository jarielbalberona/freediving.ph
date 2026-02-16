import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";

export function useDiveSpots(initialDiveSpots?: any) {
  return useQuery({
    queryKey: ["dive-spots"],
    queryFn: async () => {
      const response = await apiCall<any[]>("/dive-spots");
      return response.data; // specifically return the data property
    },
    initialData: initialDiveSpots,
  });
}
