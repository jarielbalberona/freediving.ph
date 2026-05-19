import type {
  CreateMediaPostRequest,
  CreateMediaPostResponse,
  ListMyMediaResponse,
  ListProfileMediaResponse,
  MediaContextType,
  MediaPostComment,
  MediaPostCommentLikeState,
  MediaPostCommentListResponse,
  MediaPostDetailResponse,
  MediaPostLikeState,
  MediaPostSaveState,
  MediaUploadResponse,
  MintMediaUrlItemRequest,
  MintMediaUrlsResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export interface ListMineParams {
  limit?: number;
  cursor?: string;
  contextType?: MediaContextType;
  contextId?: string;
}

export const mediaApi = {
  upload: async (
    file: File,
    contextType: MediaContextType,
    contextId?: string,
  ): Promise<MediaUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("contextType", contextType);
    if (contextId) {
      formData.append("contextId", contextId);
    }

    return fphgoFetchClient<MediaUploadResponse>(routes.v1.media.upload(), {
      method: "POST",
      body: formData,
    });
  },

  uploadMultiple: async (
    files: File[],
    contextType: MediaContextType,
    contextId?: string,
  ): Promise<{
    items: MediaUploadResponse[];
    errors?: Array<{ index: number; code: string; message: string }>;
  }> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("contextType", contextType);
    if (contextId) {
      formData.append("contextId", contextId);
    }

    return fphgoFetchClient<{
      items: MediaUploadResponse[];
      errors?: Array<{ index: number; code: string; message: string }>;
    }>(routes.v1.media.uploadMultiple(), {
      method: "POST",
      body: formData,
    });
  },

  listMine: async (
    params: ListMineParams = {},
  ): Promise<ListMyMediaResponse> => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.contextType) query.set("contextType", params.contextType);
    if (params.contextId) query.set("contextId", params.contextId);

    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fphgoFetchClient<ListMyMediaResponse>(
      `${routes.v1.media.mine()}${suffix}`,
    );
  },

  mintUrls: async (
    items: MintMediaUrlItemRequest[],
  ): Promise<MintMediaUrlsResponse> => {
    return fphgoFetchClient<MintMediaUrlsResponse>(routes.v1.media.urls(), {
      method: "POST",
      body: { items },
    });
  },

  createPost: async (
    payload: CreateMediaPostRequest,
  ): Promise<CreateMediaPostResponse> => {
    return fphgoFetchClient<CreateMediaPostResponse>(routes.v1.media.posts(), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },

  getPost: async (postId: string): Promise<MediaPostDetailResponse> => {
    return fphgoFetchClient<MediaPostDetailResponse>(
      routes.v1.media.postById(postId),
    );
  },

  likeMediaPost: async (postId: string): Promise<MediaPostLikeState> => {
    return fphgoFetchClient<MediaPostLikeState>(routes.v1.media.postLikes(postId), {
      method: "POST",
    });
  },

  unlikeMediaPost: async (postId: string): Promise<MediaPostLikeState> => {
    return fphgoFetchClient<MediaPostLikeState>(routes.v1.media.postLikes(postId), {
      method: "DELETE",
    });
  },

  saveMediaPost: async (postId: string): Promise<MediaPostSaveState> => {
    return fphgoFetchClient<MediaPostSaveState>(routes.v1.media.postSaves(postId), {
      method: "POST",
    });
  },

  unsaveMediaPost: async (postId: string): Promise<MediaPostSaveState> => {
    return fphgoFetchClient<MediaPostSaveState>(routes.v1.media.postSaves(postId), {
      method: "DELETE",
    });
  },

  listPostComments: async (
    postId: string,
    params: { limit?: number; cursor?: string } = {},
  ): Promise<MediaPostCommentListResponse> => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.cursor) query.set("cursor", params.cursor);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fphgoFetchClient<MediaPostCommentListResponse>(
      `${routes.v1.media.postComments(postId)}${suffix}`,
    );
  },

  createPostComment: async (
    postId: string,
    body: string,
  ): Promise<MediaPostComment> => {
    return fphgoFetchClient<MediaPostComment>(
      routes.v1.media.postComments(postId),
      {
        method: "POST",
        body: { body },
      },
    );
  },

  deletePostComment: async (
    postId: string,
    commentId: string,
  ): Promise<void> => {
    await fphgoFetchClient<void>(
      `${routes.v1.media.postComments(postId)}/${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
  },

  likeMediaPostComment: async (
    postId: string,
    commentId: string,
  ): Promise<MediaPostCommentLikeState> => {
    return fphgoFetchClient<MediaPostCommentLikeState>(
      routes.v1.media.postCommentLikes(postId, commentId),
      { method: "POST" },
    );
  },

  unlikeMediaPostComment: async (
    postId: string,
    commentId: string,
  ): Promise<MediaPostCommentLikeState> => {
    return fphgoFetchClient<MediaPostCommentLikeState>(
      routes.v1.media.postCommentLikes(postId, commentId),
      { method: "DELETE" },
    );
  },

  listProfileMedia: async (
    username: string,
    params: { limit?: number; cursor?: string } = {},
  ): Promise<ListProfileMediaResponse> => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.cursor) query.set("cursor", params.cursor);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fphgoFetchClient<ListProfileMediaResponse>(
      `${routes.v1.media.byUsername(username)}${suffix}`,
    );
  },
};
