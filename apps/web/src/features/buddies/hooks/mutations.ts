import { useMutation, useQueryClient } from "@tanstack/react-query";

import { buddiesApi } from "../api/buddies";

export const useSendBuddyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toUserId: number) => buddiesApi.sendRequest(toUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};

export const useAcceptBuddyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => buddiesApi.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};

export const useRejectBuddyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason?: string }) =>
      buddiesApi.rejectRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};

export const useRemoveBuddy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buddyUserId: number) => buddiesApi.removeBuddy(buddyUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};
