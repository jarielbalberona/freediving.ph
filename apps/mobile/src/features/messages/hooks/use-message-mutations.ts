import { useAuth } from "@clerk/expo";
import type {
  MessagingThreadDetailResponse,
  MessagingThreadListResponse,
  MessagingThreadMessagesResponse,
} from "@freediving.ph/types";
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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(
        401,
        "Checking your session. Try again in a moment.",
        null,
      );
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const requireThreadId = (threadId: string) => {
  const trimmed = threadId.trim();
  if (!trimmed) {
    throw new FphgoApiError(400, "Conversation unavailable.", null);
  }
  return trimmed;
};

const requireMessageId = (messageId: string) => {
  const trimmed = messageId.trim();
  if (!trimmed) {
    throw new FphgoApiError(400, "Message unavailable.", null);
  }
  return trimmed;
};

const requireMessageBody = (body: string) => {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new FphgoApiError(400, "Write a message before sending.", null);
  }
  return trimmed;
};

export const useSendMessageMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (body: string) => {
      const targetThreadId = requireThreadId(threadId);
      const messageBody = requireMessageBody(body);
      return sendThreadMessage(
        targetThreadId,
        { body: messageBody, clientId: `mobile-${targetThreadId}-${Date.now()}` },
        await getRequiredToken(),
      );
    },
    onSuccess: (response) => {
      queryClient.setQueryData<MessagingThreadMessagesResponse>(
        mobileQueryKeys.messages.messages(threadId),
        (current) => {
          if (!current) return { items: [response.message] };
          const items = current.items.filter(
            (item) =>
              item.id !== response.message.id &&
              item.clientId !== response.message.clientId,
          );
          return { ...current, items: [...items, response.message] };
        },
      );
      queryClient.setQueriesData<MessagingThreadListResponse>(
        { queryKey: mobileQueryKeys.messages.threadLists() },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === threadId
                ? {
                    ...item,
                    hasUnread: false,
                    lastMessage: response.message,
                    lastMessageAt: response.message.createdAt,
                    unreadCount: 0,
                  }
                : item,
            ),
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.threadLists(),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.unreadCount(),
      });
    },
  });
};

export const useResolveMessageRequestMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (action: "accept" | "decline") => {
      const targetThreadId = requireThreadId(threadId);
      const token = await getRequiredToken();
      return action === "accept"
        ? acceptThreadRequest(targetThreadId, token)
        : declineThreadRequest(targetThreadId, token);
    },
    onSuccess: (_response, action) => {
      if (action === "decline") {
        queryClient.removeQueries({
          queryKey: mobileQueryKeys.messages.detail(threadId),
        });
        queryClient.removeQueries({
          queryKey: mobileQueryKeys.messages.messages(threadId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.detail(threadId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.messages(threadId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.threadLists(),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.unreadCount(),
      });
    },
  });
};

export const useMarkThreadReadMutation = (threadId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (lastReadMessageId: string) => {
      const targetThreadId = requireThreadId(threadId);
      return markThreadRead(
        targetThreadId,
        requireMessageId(lastReadMessageId),
        await getRequiredToken(),
      );
    },
    onSuccess: (_response, lastReadMessageId) => {
      queryClient.setQueryData<MessagingThreadDetailResponse>(
        mobileQueryKeys.messages.detail(threadId),
        (current) => (current ? { ...current, lastReadMessageId } : current),
      );
      queryClient.setQueriesData<MessagingThreadListResponse>(
        { queryKey: mobileQueryKeys.messages.threadLists() },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === threadId
                ? { ...item, hasUnread: false, unreadCount: 0 }
                : item,
            ),
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.unreadCount(),
      });
    },
  });
};
