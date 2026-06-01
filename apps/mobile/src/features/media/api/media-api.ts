import type {
  CreateMediaPostRequest,
  CreateMediaPostResponse,
  CreateMomentUploadIntentRequest,
  MediaContextType,
  ListProfileMediaResponse,
  MediaPostComment,
  MediaPostCommentLikeState,
  MediaPostCommentListResponse,
  MediaPostDetailResponse,
  MediaPostLikeState,
  MediaPostSaveState,
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

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const uploadMediaFiles = (
  files: NativeUploadFile[],
  contextType: MediaContextType,
  authToken: string,
  contextId?: string,
) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file as unknown as Blob);
  }
  formData.append("contextType", contextType);
  if (contextId?.trim()) {
    formData.append("contextId", contextId.trim());
  }

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

export const getMediaPostDetail = (postId: string) =>
  fphgoFetch<MediaPostDetailResponse>(
    `/v1/media/posts/${encodeURIComponent(postId)}`,
    { auth: "optional" },
  );

export const likeMediaPost = (postId: string, authToken: string) =>
  fphgoFetch<MediaPostLikeState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/likes`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const unlikeMediaPost = (postId: string, authToken: string) =>
  fphgoFetch<MediaPostLikeState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/likes`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

export const saveMediaPost = (postId: string, authToken: string) =>
  fphgoFetch<MediaPostSaveState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/saves`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const unsaveMediaPost = (postId: string, authToken: string) =>
  fphgoFetch<MediaPostSaveState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/saves`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

export const getMediaPostComments = (
  postId: string,
  params: { limit?: number } = {},
) =>
  fphgoFetch<MediaPostCommentListResponse>(
    withQuery(`/v1/media/posts/${encodeURIComponent(postId)}/comments`, {
      limit: params.limit,
    }),
    { auth: "optional" },
  );

export const createMediaPostComment = (
  postId: string,
  payload: { body: string },
  authToken: string,
) =>
  fphgoFetch<MediaPostComment>(
    `/v1/media/posts/${encodeURIComponent(postId)}/comments`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

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

export const deleteMediaPostComment = (postId: string, commentId: string, authToken: string) =>
  fphgoFetch<void>(
    `/v1/media/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

export const likeMediaPostComment = (
  postId: string,
  commentId: string,
  authToken: string,
) =>
  fphgoFetch<MediaPostCommentLikeState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/likes`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const unlikeMediaPostComment = (
  postId: string,
  commentId: string,
  authToken: string,
) =>
  fphgoFetch<MediaPostCommentLikeState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/likes`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

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

export const getProfileMedia = (
  username: string,
  params: { limit?: number; cursor?: string } = {},
) =>
  fphgoFetch<ListProfileMediaResponse>(
    withQuery(`/v1/profiles/${encodeURIComponent(username)}/media`, {
      limit: params.limit,
      cursor: params.cursor,
    }),
    { auth: "optional" },
  );
