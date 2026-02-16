import { useMutation, useQueryClient } from '@tanstack/react-query';
import { diveSpotsApi } from '../api/diveSpots';
import type {
  CreateDiveSpotRequest,
  UpdateDiveSpotRequest,
  CreateDiveSpotReviewRequest
} from '../types';

export const useCreateDiveSpot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiveSpotRequest) =>
      diveSpotsApi.createDiveSpot(data),
    onSuccess: (response, variables) => {
      // Invalidate dive spots list
      queryClient.invalidateQueries({
        queryKey: ['dive-spots']
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
        queryKey: ['dive-spot', variables.diveSpotId]
      });
      // Invalidate dive spots list
      queryClient.invalidateQueries({
        queryKey: ['dive-spots']
      });
    },
  });
};

export const useCreateDiveSpotReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiveSpotReviewRequest) =>
      diveSpotsApi.createDiveSpotReview(data),
    onSuccess: (response, variables) => {
      // Invalidate dive spot reviews
      queryClient.invalidateQueries({
        queryKey: ['dive-spot-reviews', variables.diveSpotId]
      });
      // Invalidate specific dive spot to update rating
      queryClient.invalidateQueries({
        queryKey: ['dive-spot', variables.diveSpotId]
      });
    },
  });
};
