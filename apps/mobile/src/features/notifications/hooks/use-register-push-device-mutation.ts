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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterPushDeviceRequest) => {
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
