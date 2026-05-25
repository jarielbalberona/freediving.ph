import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  acceptThreadRequest,
  declineThreadRequest,
  markThreadRead,
  sendThreadMessage,
} from "@/features/messages/api/messages-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

export const useSendMessageMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (body: string) =>
      sendThreadMessage(
        threadId,
        { body, clientId: `mobile-${Date.now()}` },
        await getRequiredToken(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.messages(threadId),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.messages.all });
    },
  });
};

export const useResolveMessageRequestMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (action: "accept" | "decline") => {
      const token = await getRequiredToken();
      return action === "accept"
        ? acceptThreadRequest(threadId, token)
        : declineThreadRequest(threadId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.detail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.messages.all });
    },
  });
};

export const useMarkThreadReadMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (lastReadMessageId: string) =>
      markThreadRead(threadId, lastReadMessageId, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.detail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.messages.all });
    },
  });
};
