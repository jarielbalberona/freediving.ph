import { useQuery } from "@tanstack/react-query";

import {
  getProfileDiving,
  getProfilePosts,
} from "@/features/profiles/api/profiles-api";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";
import { mobileQueryKeys } from "@/lib/query";

export const useProfilePostsQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfilePosts(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.posts(safeUsername ?? ""),
    staleTime: 2 * 60 * 1000,
  });
};

export const useProfileDivingQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfileDiving(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.diving(safeUsername ?? ""),
    staleTime: 2 * 60 * 1000,
  });
};
