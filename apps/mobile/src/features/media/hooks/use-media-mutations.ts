import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ImagePickerAsset } from "expo-image-picker";
import type { CreateMediaPostRequest } from "@freediving.ph/types";

import {
  completeMomentUpload,
  createMediaPost,
  createMomentUploadIntent,
  syncMomentStatus,
  uploadMediaFiles,
  uploadMomentToDirectUrl,
} from "@/features/media/api/media-api";
import {
  filenameForAsset,
  mimeTypeForAsset,
} from "@/features/media/lib/media-upload-guards";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const requirePostId = (postId: string) => {
  if (!postId) throw new FphgoApiError(400, "Moment unavailable.", null);
  return postId;
};

const nativeFileFromAsset = (asset: ImagePickerAsset, fallbackPrefix: string) => ({
  name: filenameForAsset(asset, fallbackPrefix),
  type: mimeTypeForAsset(asset),
  uri: asset.uri,
});

export const useCreatePhotoPostMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      assets: ImagePickerAsset[];
      caption?: string;
      diveSiteId: string;
    }) => {
      const token = await getRequiredToken();
      const upload = await uploadMediaFiles(
        input.assets.map((asset, index) =>
          nativeFileFromAsset(asset, `photo-${index + 1}`),
        ),
        "profile_feed",
        token,
      );
      if (upload.errors?.length) {
        throw new FphgoApiError(
          400,
          upload.errors[0]?.message ?? "Could not upload one of the photos.",
          upload,
        );
      }
      if (upload.items.length === 0) {
        throw new FphgoApiError(400, "Choose at least one photo.", upload);
      }
      const payload: CreateMediaPostRequest = {
        applyCaptionToAll: true,
        diveSiteId: input.diveSiteId,
        items: upload.items.map((item, index) => ({
          caption: input.caption || null,
          height: item.height,
          mediaObjectId: item.id,
          mimeType: item.mimeType,
          sortOrder: index,
          storageKey: item.objectKey,
          type: "photo",
          width: item.width,
        })),
        postCaption: input.caption || null,
        source: "create_post",
      };
      return createMediaPost(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
  });
};

export const useCreateMomentMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      asset: ImagePickerAsset;
      caption?: string;
      diveSiteId?: string;
    }) => {
      const token = await getRequiredToken();
      const intent = await createMomentUploadIntent(
        {
          caption: input.caption || null,
          contentType: mimeTypeForAsset(input.asset),
          diveSiteId: input.diveSiteId || null,
          filename: filenameForAsset(input.asset, "moment"),
        },
        token,
      );
      await uploadMomentToDirectUrl(
        intent.uploadUrl,
        nativeFileFromAsset(input.asset, "moment"),
      );
      return completeMomentUpload(intent.postId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
  });
};

export const useSyncMomentStatusMutation = () => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (postId: string) =>
      syncMomentStatus(requirePostId(postId), await getRequiredToken()),
  });
};
