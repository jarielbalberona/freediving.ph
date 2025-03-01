import { useQuery } from "@tanstack/react-query";
import { appAPICall } from "@/lib/api";

export function useDiveSpots(initialDiveSpots?: any) {
  return useQuery({
    queryKey: ["dive-spots"],
    queryFn: () => appAPICall("/dive-spots"),
    initialData: initialDiveSpots,
  });
}
