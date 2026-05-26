import type {
  CreateMediaPostRequest,
  CreateMediaPostResponse,
  CreateMomentUploadIntentRequest,
  MediaContextType,
  MediaUploadResponse,
  MomentStatusResponse,
  MomentUploadIntentResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

type NativeUploadFile = {
  name: string;
  type: string;
  uri: string;
};

export const uploadMediaFiles = (
  files: NativeUploadFile[],
  contextType: MediaContextType,
  authToken: string,
) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file as unknown as Blob);
  }
  formData.append("contextType", contextType);

  return fphgoFetch<{
    errors?: Array<{ code: string; index: number; message: string }>;
    items: MediaUploadResponse[];
  }>("/v1/media/upload-multiple", {
    auth: "required",
    authToken,
    body: formData,
    method: "POST",
  });
};

export const createMediaPost = (
  payload: CreateMediaPostRequest,
  authToken: string,
) =>
  fphgoFetch<CreateMediaPostResponse>("/v1/media/posts", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const createMomentUploadIntent = (
  payload: CreateMomentUploadIntentRequest,
  authToken: string,
) =>
  fphgoFetch<MomentUploadIntentResponse>("/v1/media/moments/upload-intents", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const completeMomentUpload = (postId: string, authToken: string) =>
  fphgoFetch<MomentStatusResponse>(
    `/v1/media/moments/${encodeURIComponent(postId)}/complete`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const syncMomentStatus = (postId: string, authToken: string) =>
  fphgoFetch<MomentStatusResponse>(
    `/v1/media/moments/${encodeURIComponent(postId)}/sync`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const uploadMomentToDirectUrl = async (
  uploadUrl: string,
  file: NativeUploadFile,
) => {
  const formData = new FormData();
  formData.append("file", file as unknown as Blob);
  const response = await fetch(uploadUrl, {
    body: formData,
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Moment upload failed.");
  }
};
