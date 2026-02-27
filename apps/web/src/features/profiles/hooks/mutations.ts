import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profilesApi } from "../api/profiles";
import type { UpdateMyProfileRequest } from "@freediving.ph/types";

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMyProfileRequest) => profilesApi.updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "me"] });
    },
  });
};
