import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '../api/media';
import type {
  CreateMediaRequest,
  UpdateMediaRequest
} from '../types';

export const useUploadMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMediaRequest) =>
      mediaApi.uploadMedia(data),
    onSuccess: (response, variables) => {
      // Invalidate media list
      queryClient.invalidateQueries({
        queryKey: ['media']
      });
    },
  });
};

export const useUpdateMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, data }: { mediaId: number; data: UpdateMediaRequest }) =>
      mediaApi.updateMedia(mediaId, data),
    onSuccess: (response, variables) => {
      // Invalidate specific media
      queryClient.invalidateQueries({
        queryKey: ['media', variables.mediaId]
      });
      // Invalidate media list
      queryClient.invalidateQueries({
        queryKey: ['media']
      });
    },
  });
};

export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: number) =>
      mediaApi.deleteMedia(mediaId),
    onSuccess: (response, variables) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['media', variables]
      });
      // Invalidate media list
      queryClient.invalidateQueries({
        queryKey: ['media']
      });
    },
  });
};
