import { useQuery } from "@tanstack/react-query";

import {
  getProfileBadges,
  getProfileDiveMap,
  getProfileDiveMemories,
  getProfileDiving,
  getProfileJourney,
  getProfilePassport,
} from "@/features/profiles/api/profiles-api";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";
import { mobileQueryKeys } from "@/lib/query";

export const useProfileDivingQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfileDiving(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.diving(safeUsername ?? ""),
    staleTime: 2 * 60 * 1000,
  });
};

export const useProfileBadgesQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfileBadges(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.badges(safeUsername ?? ""),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProfileDiveMapQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfileDiveMap(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.diveMap(safeUsername ?? ""),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProfilePassportQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfilePassport(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.passport(safeUsername ?? ""),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProfileJourneyQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfileJourney(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.journey(safeUsername ?? ""),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProfileDiveMemoriesQuery = (username: string | undefined) => {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getProfileDiveMemories(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.diveMemories(safeUsername ?? ""),
    staleTime: 5 * 60 * 1000,
  });
};
