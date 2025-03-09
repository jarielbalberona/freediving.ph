import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";

export function useDiveSpots(initialDiveSpots?: any) {
  return useQuery({
    queryKey: ["dive-spots"],
    queryFn: () => apiCall("/dive-spots"),
    initialData: initialDiveSpots,
  });
}
