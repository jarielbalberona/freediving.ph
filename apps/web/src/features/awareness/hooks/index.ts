import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { awarenessApi } from "../api/awareness";

export const useAwarenessPosts = () =>
  useQuery({
    queryKey: queryKeys.awareness.list(),
    queryFn: awarenessApi.list,
  });
