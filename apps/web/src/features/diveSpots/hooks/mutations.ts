import { useMutation, useQueryClient } from '@tanstack/react-query';
import { diveSpotsApi } from '../api/diveSpots';
import { queryKeys } from '@/lib/query/query-keys';
import type {
  CreateDiveSpotRequest,
  UpdateDiveSpotRequest,
  CreateDiveSpotReviewRequest
} from '@freediving.ph/types';

export const useCreateDiveSpot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiveSpotRequest) =>
      diveSpotsApi.createDiveSpot(data),
    onSuccess: (response, variables) => {
      // Invalidate dive spots list
      queryClient.invalidateQueries({
        queryKey: queryKeys.diveSpots.all
      });
    },
  });
};

export const useUpdateDiveSpot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diveSpotId, data }: { diveSpotId: number; data: UpdateDiveSpotRequest }) =>
      diveSpotsApi.updateDiveSpot(diveSpotId, data),
    onSuccess: (response, variables) => {
      // Invalidate specific dive spot
      queryClient.invalidateQueries({
        queryKey: queryKeys.diveSpots.detail(variables.diveSpotId)
      });
      // Invalidate dive spots list
      queryClient.invalidateQueries({
        queryKey: queryKeys.diveSpots.all
      });
    },
  });
};

export const useCreateDiveSpotReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diveSpotId, data }: { diveSpotId: number; data: CreateDiveSpotReviewRequest }) =>
      diveSpotsApi.createDiveSpotReview(diveSpotId, data),
    onSuccess: (response, variables) => {
      // Invalidate dive spot reviews
      queryClient.invalidateQueries({
        queryKey: queryKeys.diveSpots.reviews(variables.diveSpotId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.diveSpots.reviewSummary(variables.diveSpotId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.diveSpots.all
      });
      // Invalidate specific dive spot to update rating
      queryClient.invalidateQueries({
        queryKey: queryKeys.diveSpots.detail(variables.diveSpotId)
      });
    },
  });
};
