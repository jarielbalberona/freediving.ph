import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RegisterPushDeviceRequest } from "@freediving.ph/types";

import {
  registerPushDevice,
  updateNotificationSettings,
} from "@/features/notifications/api/notifications-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

export function useRegisterPushDeviceMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterPushDeviceRequest) => {
      const authToken = await getToken();
      if (!authToken) {
        throw new FphgoApiError(401, "Authentication required", null);
      }
      const device = await registerPushDevice(input, authToken);
      const settings = await updateNotificationSettings(
        { pushEnabled: true },
        authToken,
      );
      return { device, settings };
    },
    onSuccess: ({ settings }) => {
      queryClient.setQueryData(mobileQueryKeys.notifications.settings(), settings);
    },
  });
}
