import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { blocksApi } from "../api/blocks";

export const useBlockedUsers = () => {
  return useQuery({
    queryKey: ["blocks", "list"],
    queryFn: () => blocksApi.list(),
    staleTime: 30_000,
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockedUserId: string) => blocksApi.block(blockedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks", "list"] });
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockedUserId: string) => blocksApi.unblock(blockedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks", "list"] });
    },
  });
};
