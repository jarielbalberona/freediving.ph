import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateNotificationSettingsRequest } from "@freediving.ph/types";

import { updateNotificationSettings } from "@/features/notifications/api/notifications-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

export function useNotificationSettingsMutation() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateNotificationSettingsRequest) => {
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
      const authToken = await getToken();
      if (!authToken) {
        throw new FphgoApiError(401, "Authentication required", null);
      }
      return updateNotificationSettings(input, authToken);
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(mobileQueryKeys.notifications.settings(), settings);
    },
  });
}
