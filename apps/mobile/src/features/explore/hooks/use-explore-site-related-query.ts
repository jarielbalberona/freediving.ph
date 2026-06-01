import { useQuery } from "@tanstack/react-query";

import {
  getExploreSiteAffinities,
  getExploreSiteCommunityPosts,
  getExploreSitePresence,
  getExploreSiteRelated,
  getExploreSiteReviews,
} from "@/features/explore/api/explore-api";
import { mobileQueryKeys } from "@/lib/query";

export function useExploreSiteRelatedQuery(slug: string | undefined) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getExploreSiteRelated(slug ?? ""),
    queryKey: mobileQueryKeys.explore.related(slug ?? ""),
    staleTime: 60 * 1000,
  });
}

export function useExploreSitePresenceQuery(slug: string | undefined) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getExploreSitePresence(slug ?? ""),
    queryKey: mobileQueryKeys.explore.presence(slug ?? ""),
    staleTime: 60 * 1000,
  });
}

export function useExploreSiteAffinitiesQuery(slug: string | undefined) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getExploreSiteAffinities(slug ?? ""),
    queryKey: mobileQueryKeys.explore.affinities(slug ?? ""),
    staleTime: 60 * 1000,
  });
}

export function useExploreSiteReviewsQuery(slug: string | undefined) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getExploreSiteReviews(slug ?? ""),
    queryKey: mobileQueryKeys.explore.reviews(slug ?? ""),
    staleTime: 60 * 1000,
  });
}

export function useExploreSiteCommunityPostsQuery(slug: string | undefined) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getExploreSiteCommunityPosts(slug ?? ""),
    queryKey: mobileQueryKeys.explore.communityPosts(slug ?? ""),
    staleTime: 60 * 1000,
  });
}
