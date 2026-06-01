import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateReportRequest } from "@freediving.ph/types";

import { blockUser, createReport, unblockUser } from "@/features/safety/api/safety-api";
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

export const useCreateReportMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateReportRequest) =>
      createReport(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.safety.reports() });
    },
  });
};

export const useBlockUserMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (blockedUserId: string) =>
      blockUser(blockedUserId, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.safety.blocks() });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.messages.all });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.buddies.relationships(),
      });
    },
  });
};

export const useUnblockUserMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (blockedUserId: string) =>
      unblockUser(blockedUserId, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.safety.blocks() });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.messages.all });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.buddies.relationships(),
      });
    },
  });
};
