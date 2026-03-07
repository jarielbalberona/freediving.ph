"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth/session";
import { profileApi } from "@/features/profile/api/profileApi";
import { normalizeUsername } from "@/lib/routes";

export const usePublicProfileQuery = (username: string) => {
  const session = useSession();
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: ["profile", "public", normalizedUsername],
    enabled: session.status !== "loading",
    queryFn: () => profileApi.getPublicProfile(normalizedUsername),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfilePostsQuery = (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: ["profile", "posts", normalizedUsername],
    queryFn: () => profileApi.getProfilePosts(normalizedUsername),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfileBucketListQuery = (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: ["profile", "bucketlist", normalizedUsername],
    queryFn: () => profileApi.getProfileBucketList(normalizedUsername),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
};
