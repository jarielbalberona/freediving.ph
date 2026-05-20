"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { profileApi } from "@/features/profile/api/profileApi";
import { queryKeys } from "@/lib/query/query-keys";
import { normalizeUsername } from "@/lib/routes";

export const usePublicProfileQuery = (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.public(normalizedUsername),
    enabled: Boolean(normalizedUsername),
    queryFn: () => profileApi.getPublicProfile(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfilePostsQuery = (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.posts(normalizedUsername),
    queryFn: () => profileApi.getProfilePosts(normalizedUsername),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfileBucketListQuery = (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.bucketList(normalizedUsername),
    queryFn: () => profileApi.getProfileBucketList(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfileDivingQuery = (username: string, enabled = true) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.diving(normalizedUsername),
    enabled: enabled && Boolean(normalizedUsername),
    queryFn: () => profileApi.getProfileDiving(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};
