import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateMyProfileRequest } from "@freediving.ph/types";

import { updateMyProfile } from "@/features/profiles/api/profiles-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

export const useUpdateMyProfileMutation = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateMyProfileRequest) => {
      const token = await getToken();
      if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
      return updateMyProfile(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.me() });
    },
  });
};
