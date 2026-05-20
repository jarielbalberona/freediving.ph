import type {
  CreateMediaPostRequest,
  MediaContextType,
} from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      queryClient.invalidateQueries({ queryKey: queryKeys.media.mineLists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.media.profileLists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
};
