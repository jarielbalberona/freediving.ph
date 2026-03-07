import { useQuery } from '@tanstack/react-query';
import { diveSpotsApi } from '../api/diveSpots';
import type { DiveSpotFilters } from '@freediving.ph/types';

export const useDiveSpots = (filters?: DiveSpotFilters) => {
  return useQuery({
    queryKey: ['dive-spots', filters],
    queryFn: () => diveSpotsApi.getDiveSpots(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useDiveSpotsMapQuery = (filters?: DiveSpotFilters, enabled = true) => {
  return useQuery({
    queryKey: ['dive-spots', 'map', filters],
    queryFn: () => diveSpotsApi.getDiveSpots({
      ...filters,
      shape: 'map',
    }),
    staleTime: 60 * 1000,
    enabled,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

export const useDiveSpotsListQuery = (filters?: DiveSpotFilters, enabled = true) => {
  return useQuery({
    queryKey: ['dive-spots', 'list', filters],
    queryFn: () => diveSpotsApi.getDiveSpots({
      ...filters,
      shape: 'list',
    }),
    staleTime: 2 * 60 * 1000,
    enabled,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

export const useDiveSpot = (diveSpotId: number) => {
  return useQuery({
    queryKey: ['dive-spot', diveSpotId],
    queryFn: () => diveSpotsApi.getDiveSpotById(diveSpotId),
    enabled: !!diveSpotId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDiveSpotReviews = (diveSpotId: number) => {
  return useQuery({
    queryKey: ['dive-spot-reviews', diveSpotId],
    queryFn: () => diveSpotsApi.getDiveSpotReviews(diveSpotId),
    enabled: !!diveSpotId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDiveSpotReviewSummary = (diveSpotId: number) => {
  return useQuery({
    queryKey: ['dive-spot-review-summary', diveSpotId],
    queryFn: () => diveSpotsApi.getDiveSpotReviewSummary(diveSpotId),
    enabled: !!diveSpotId,
    staleTime: 5 * 60 * 1000,
  });
};
