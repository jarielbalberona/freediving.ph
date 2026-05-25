import type {
  CreateMediaPostRequest,
  CreateMomentUploadIntentRequest,
  MediaContextType,
} from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackProductEvent } from "@/lib/analytics/product-events";
import { queryKeys } from "@/lib/query/query-keys";

import { mediaApi } from "../api/media";

export interface UploadMediaInput {
  file: File;
  contextType: MediaContextType;
  contextId?: string;
}

export interface UploadMultipleMediaInput {
  files: File[];
  contextType: MediaContextType;
  contextId?: string;
}

export const useUploadMedia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, contextType, contextId }: UploadMediaInput) =>
      mediaApi.upload(file, contextType, contextId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.mineLists() });
    },
  });
};

export const useUploadMultipleMedia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, contextType, contextId }: UploadMultipleMediaInput) =>
      mediaApi.uploadMultiple(files, contextType, contextId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.mineLists() });
    },
  });
};

export const useCreateMediaPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMediaPostRequest) =>
      mediaApi.createPost(payload),
    onSuccess: () => {
      trackProductEvent("media_posted");
      queryClient.invalidateQueries({ queryKey: queryKeys.media.mineLists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.media.profileLists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
};

export const useCreateMomentUploadIntent = () => {
  return useMutation({
    mutationFn: (payload: CreateMomentUploadIntentRequest) =>
      mediaApi.createMomentUploadIntent(payload),
  });
};

export const useCompleteMomentUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => mediaApi.completeMomentUpload(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.profileLists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.activityAll });
    },
  });
};

export const useSyncMomentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => mediaApi.syncMomentStatus(postId),
    onSuccess: (result) => {
      if (result.status === "ready") {
        trackProductEvent("media_posted");
        queryClient.invalidateQueries({ queryKey: queryKeys.media.profileLists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.activityAll });
      }
    },
  });
};
