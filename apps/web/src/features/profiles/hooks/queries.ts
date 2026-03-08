import { useQuery } from "@tanstack/react-query";

import { profilesApi } from "../api/profiles";

export const useMyProfile = (enabled = true) => {
  return useQuery({
    queryKey: ["profiles", "me"],
    queryFn: () => profilesApi.getMyProfile(),
    enabled,
    staleTime: 60_000,
  });
};

export const useProfileByUserId = (userId?: string | null) => {
  return useQuery({
    queryKey: ["profiles", userId],
    queryFn: () => profilesApi.getProfileByUserId(String(userId)),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
};

export const useUserSearch = (query?: string, limit = 10) => {
  return useQuery({
    queryKey: ["profiles", "search", query, limit],
    queryFn: () => profilesApi.searchUsers(String(query), limit),
    enabled: Boolean(query && query.trim().length > 0),
    staleTime: 30_000,
  });
};

export const useSavedHub = (enabled = true) => {
  return useQuery({
    queryKey: ["profiles", "saved"],
    queryFn: () => profilesApi.getSavedHub(),
    enabled,
    staleTime: 30_000,
  });
};
