import { useQuery } from "@tanstack/react-query";

import { profilesApi } from "../api/profiles";

export const useProfileByUsername = (username?: string | null) => {
  return useQuery({
    queryKey: ["profiles", username],
    queryFn: () => profilesApi.getByUsername(String(username)),
    enabled: Boolean(username),
    staleTime: 60_000,
  });
};
