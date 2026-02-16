import { useQuery } from "@tanstack/react-query";

import { awarenessApi } from "../api/awareness";

export const useAwarenessPosts = () =>
  useQuery({
    queryKey: ["awareness"],
    queryFn: awarenessApi.list,
  });
