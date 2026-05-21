import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { collaborationApi } from "../api/collaboration";

export const useCollaborationPosts = () =>
  useQuery({
    queryKey: queryKeys.collaboration.list(),
    queryFn: collaborationApi.list,
  });
