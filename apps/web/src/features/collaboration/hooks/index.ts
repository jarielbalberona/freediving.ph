import { useQuery } from "@tanstack/react-query";

import { collaborationApi } from "../api/collaboration";

export const useCollaborationPosts = () =>
  useQuery({
    queryKey: ["collaboration"],
    queryFn: collaborationApi.list,
  });
