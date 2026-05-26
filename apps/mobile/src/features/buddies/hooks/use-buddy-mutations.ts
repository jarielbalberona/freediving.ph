import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  BuddyFinderListResponse,
  CreateBuddyFinderIntentRequest,
} from "@freediving.ph/types";

import {
  createBuddyFinderIntent,
  deleteBuddyFinderIntent,
  getBuddyFinderMessageEntry,
} from "@/features/buddies/api/buddies-api";
import { openDirectMessageThread } from "@/features/messages/api/messages-api";
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

const requireIntentId = (intentId: string) => {
  const trimmedIntentId = intentId.trim();
  if (!trimmedIntentId) {
    throw new FphgoApiError(400, "Buddy post unavailable.", null);
  }
  return trimmedIntentId;
};

export const useCreateBuddyIntentMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateBuddyFinderIntentRequest) =>
      createBuddyFinderIntent(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.buddies.intentLists(),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.buddies.previews(),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.buddies.mine() });
    },
  });
};

export const useDeleteBuddyIntentMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (intentId: string) =>
      deleteBuddyFinderIntent(requireIntentId(intentId), await getRequiredToken()),
    onSuccess: (_response, intentId) => {
      queryClient.setQueryData<BuddyFinderListResponse>(
        mobileQueryKeys.buddies.mine(),
        (current) =>
          current
            ? {
                ...current,
                items: current.items.filter((item) => item.id !== intentId),
              }
            : current,
      );
      queryClient.setQueriesData<BuddyFinderListResponse>(
        { queryKey: mobileQueryKeys.buddies.intentLists() },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.filter((item) => item.id !== intentId),
              }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.buddies.previews(),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.buddies.mine() });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.buddies.intentLists(),
      });
    },
  });
};

export const useBuddyMessageEntryMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (intentId: string) => {
      const token = await getRequiredToken();
      const entry = await getBuddyFinderMessageEntry(requireIntentId(intentId), token);
      return openDirectMessageThread(
        { targetUserId: entry.recipientUserId },
        token,
      );
    },
    onSuccess: (thread) => {
      queryClient.setQueryData(mobileQueryKeys.messages.detail(thread.id), thread);
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.messages.threadLists(),
      });
    },
  });
};
