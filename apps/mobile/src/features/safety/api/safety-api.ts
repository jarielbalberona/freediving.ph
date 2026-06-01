import type {
  CreateBlockResponse,
  CreateReportRequest,
  CreateReportResponse,
  ListBlocksResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

export const createReport = (
  payload: CreateReportRequest,
  authToken: string,
) =>
  fphgoFetch<CreateReportResponse>("/v1/reports", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const listBlockedUsers = (authToken: string, limit = 50) =>
  fphgoFetch<ListBlocksResponse>(`/v1/blocks?limit=${limit}`, {
    auth: "required",
    authToken,
  });

export const blockUser = (blockedUserId: string, authToken: string) =>
  fphgoFetch<CreateBlockResponse>("/v1/blocks", {
    auth: "required",
    authToken,
    body: { blockedUserId },
    method: "POST",
  });

export const unblockUser = (blockedUserId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/blocks/${encodeURIComponent(blockedUserId)}`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });
