import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '../api/media';
import type { MediaFilters } from '../types';

export const useMedia = (filters?: MediaFilters) => {
  return useQuery({
    queryKey: ['media', filters],
    queryFn: () => mediaApi.getMedia(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useMediaById = (mediaId: number) => {
  return useQuery({
    queryKey: ['media', mediaId],
    queryFn: () => mediaApi.getMediaById(mediaId),
    enabled: !!mediaId,
    staleTime: 5 * 60 * 1000,
  });
};
