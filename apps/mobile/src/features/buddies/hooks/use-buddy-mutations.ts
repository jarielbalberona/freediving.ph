import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreateBuddyFinderIntentRequest } from "@freediving.ph/types";

import {
  createBuddyFinderIntent,
  deleteBuddyFinderIntent,
  getBuddyFinderMessageEntry,
} from "@/features/buddies/api/buddies-api";
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

export const useCreateBuddyIntentMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateBuddyFinderIntentRequest) =>
      createBuddyFinderIntent(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.buddies.all });
    },
  });
};

export const useDeleteBuddyIntentMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (intentId: string) =>
      deleteBuddyFinderIntent(intentId, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.buddies.all });
    },
  });
};

export const useBuddyMessageEntryMutation = () => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (intentId: string) =>
      getBuddyFinderMessageEntry(intentId, await getRequiredToken()),
  });
};
