import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateNotificationSettingsRequest } from "@freediving.ph/types";

import { updateNotificationSettings } from "@/features/notifications/api/notifications-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

export function useNotificationSettingsMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateNotificationSettingsRequest) => {
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
