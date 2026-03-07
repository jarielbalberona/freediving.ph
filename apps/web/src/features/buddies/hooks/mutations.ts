import { useMutation, useQueryClient } from "@tanstack/react-query";

import { buddiesApi } from "../api/buddies";

export const useSendBuddyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => buddiesApi.sendRequest(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};

export const useAcceptBuddyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => buddiesApi.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};

export const useDeclineBuddyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => buddiesApi.declineRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};

export const useCancelBuddyRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => buddiesApi.cancelRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};

export const useRemoveBuddy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buddyUserId: string) => buddiesApi.removeBuddy(buddyUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
    },
  });
};
