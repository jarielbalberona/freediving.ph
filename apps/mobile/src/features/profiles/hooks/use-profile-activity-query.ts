import { useQuery } from "@tanstack/react-query";

import {
  getProfileDiving,
  getProfilePosts,
} from "@/features/profiles/api/profiles-api";
import { mobileQueryKeys } from "@/lib/query";

export const useProfilePostsQuery = (username: string | undefined) =>
  useQuery({
    enabled: Boolean(username),
    queryFn: () => getProfilePosts(username ?? ""),
    queryKey: mobileQueryKeys.profile.posts(username ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const useProfileDivingQuery = (username: string | undefined) =>
  useQuery({
    enabled: Boolean(username),
    queryFn: () => getProfileDiving(username ?? ""),
    queryKey: mobileQueryKeys.profile.diving(username ?? ""),
    staleTime: 2 * 60 * 1000,
  });
