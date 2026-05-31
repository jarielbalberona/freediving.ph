"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { profileApi } from "@/features/profile/api/profileApi";
import { queryKeys } from "@/lib/query/query-keys";
import { normalizeUsername } from "@/lib/routes";

export const useProfileViewQuery = (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.view(normalizedUsername),
    enabled: Boolean(normalizedUsername),
    queryFn: () => profileApi.getProfileView(normalizedUsername),
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

export const useProfileDiveMapQuery = (username: string, enabled = true) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.diveMap(normalizedUsername),
    enabled: enabled && Boolean(normalizedUsername),
    queryFn: () => profileApi.getProfileDiveMap(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfileDiveMapSiteQuery = (
  username: string,
  siteId?: string | null,
  enabled = true,
) => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedSiteId = siteId ?? "";

  return useQuery({
    queryKey: queryKeys.profile.diveMapSite(normalizedUsername, normalizedSiteId),
    enabled: enabled && Boolean(normalizedUsername && normalizedSiteId),
    queryFn: () =>
      profileApi.getProfileDiveMapSite(normalizedUsername, normalizedSiteId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfileBadgesQuery = (username: string, enabled = true) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.badges(normalizedUsername),
    enabled: enabled && Boolean(normalizedUsername),
    queryFn: () => profileApi.getProfileBadges(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfileJourneyQuery = (username: string, enabled = true) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.journey(normalizedUsername),
    enabled: enabled && Boolean(normalizedUsername),
    queryFn: () => profileApi.getProfileJourney(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfilePassportQuery = (username: string, enabled = true) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.passport(normalizedUsername),
    enabled: enabled && Boolean(normalizedUsername),
    queryFn: () => profileApi.getProfilePassport(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useProfileDiveMemoriesQuery = (
  username: string,
  enabled = true,
) => {
  const normalizedUsername = normalizeUsername(username);

  return useQuery({
    queryKey: queryKeys.profile.diveMemories(normalizedUsername),
    enabled: enabled && Boolean(normalizedUsername),
    queryFn: () => profileApi.getProfileDiveMemories(normalizedUsername),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};

export const useMyDiveMemoryTagsQuery = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.profile.myDiveMemoryTags(),
    enabled,
    queryFn: () => profileApi.getMyDiveMemoryTags(),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
};
