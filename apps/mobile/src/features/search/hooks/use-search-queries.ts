import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import { getExploreSites } from "@/features/explore/api/explore-api";
import { getSavedHub, searchUsers } from "@/features/profiles/api/profiles-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export const usePeopleSearchQuery = (query: string) =>
  useQuery({
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const response = await searchUsers(query, 12);
      return response.items ?? [];
    },
    queryKey: mobileQueryKeys.search.people(query.trim()),
    staleTime: 30 * 1000,
  });

export const useSiteSearchQuery = (query: string) =>
  useQuery({
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const response = await getExploreSites({ limit: 12, search: query.trim() });
      return response.items ?? [];
    },
    queryKey: mobileQueryKeys.search.sites(query.trim()),
    staleTime: 30 * 1000,
  });

export const useSavedHubQuery = () => {
  const { isLoaded, isSignedIn } = useAuth();
  return useAuthenticatedFphgoQuery({
    enabled: isLoaded && Boolean(isSignedIn),
    queryFn: async (_context, authToken) => getSavedHub(authToken),
    queryKey: mobileQueryKeys.profile.saved(),
    staleTime: 60 * 1000,
  });
};
