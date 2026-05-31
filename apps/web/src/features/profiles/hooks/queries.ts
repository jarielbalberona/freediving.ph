import { useQuery } from "@tanstack/react-query";

import {
  normalizeProfileSearchParams,
  queryKeys,
} from "@/lib/query/query-keys";

import { profilesApi } from "../api/profiles";

export const useMyProfile = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => profilesApi.getMyProfile(),
    enabled,
    staleTime: 60_000,
  });
};

export const useProfileByUserId = (userId?: string | null) => {
  return useQuery({
    queryKey: queryKeys.profile.byUserId(String(userId)),
    queryFn: () => profilesApi.getProfileByUserId(String(userId)),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
};

export const useUserSearch = (query?: string, limit = 10) => {
  const params = normalizeProfileSearchParams({ query, limit });
  return useQuery({
    queryKey: queryKeys.profile.search(params),
    queryFn: () =>
      profilesApi.searchUsers(String(params.query), params.limit ?? limit),
    enabled: Boolean(query && query.trim().length > 0),
    staleTime: 30_000,
  });
};

export const useSavedHub = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.profile.saved(),
    queryFn: () => profilesApi.getSavedHub(),
    enabled,
    staleTime: 30_000,
  });
};

export const useMyBadges = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.profile.myBadges(),
    queryFn: () => profilesApi.getMyBadges(),
    enabled,
    staleTime: 30_000,
  });
};

export const useProfileBadges = (username: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.profile.badges(username),
    queryFn: () => profilesApi.getProfileBadgesByUsername(username),
    enabled: enabled && Boolean(username),
    staleTime: 60_000,
  });
};
