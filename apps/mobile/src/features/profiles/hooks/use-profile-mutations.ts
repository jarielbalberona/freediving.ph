import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ProfileViewResponse,
  UpdateMyProfileRequest,
} from "@freediving.ph/types";

import { updateMyProfile } from "@/features/profiles/api/profiles-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

export const useUpdateMyProfileMutation = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateMyProfileRequest) => {
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
      return updateMyProfile(payload, token);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(mobileQueryKeys.profile.me(), response);
      if (response.profile.username) {
        queryClient.setQueryData<ProfileViewResponse>(
          mobileQueryKeys.profile.public(response.profile.username),
          (current) =>
            current
              ? {
                  ...current,
                  profile: {
                    ...current.profile,
                    avatarUrl: response.profile.avatarUrl,
                    bio: response.profile.bio,
                    displayName: response.profile.displayName,
                    username: response.profile.username,
                  },
                }
              : current,
        );
        queryClient.invalidateQueries({
          queryKey: mobileQueryKeys.profile.public(response.profile.username),
        });
      }
    },
  });
};
