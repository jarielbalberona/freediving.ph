import type {
  ListMyMediaResponse,
  MediaContextType,
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
  ): Promise<{ items: MediaUploadResponse[]; errors?: Array<{ index: number; code: string; message: string }> }> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("contextType", contextType);
    if (contextId) {
      formData.append("contextId", contextId);
    }

    return fphgoFetchClient<{ items: MediaUploadResponse[]; errors?: Array<{ index: number; code: string; message: string }> }>(
      routes.v1.media.uploadMultiple(),
      {
        method: "POST",
        body: formData,
      },
    );
  },

  listMine: async (params: ListMineParams = {}): Promise<ListMyMediaResponse> => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.contextType) query.set("contextType", params.contextType);
    if (params.contextId) query.set("contextId", params.contextId);

    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fphgoFetchClient<ListMyMediaResponse>(`${routes.v1.media.mine()}${suffix}`);
  },

  mintUrls: async (items: MintMediaUrlItemRequest[]): Promise<MintMediaUrlsResponse> => {
    return fphgoFetchClient<MintMediaUrlsResponse>(routes.v1.media.urls(), {
      method: "POST",
      body: { items },
    });
  },
};
