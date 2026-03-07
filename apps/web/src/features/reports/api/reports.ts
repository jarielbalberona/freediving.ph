import type {
  CreateReportRequest,
  CreateReportResponse,
  GetReportDetailResponse,
  ListReportsQuery,
  ListReportsResponse,
  ModerationActionRequest,
  ModerationActionResponse,
  UpdateReportStatusRequest,
  UpdateReportStatusResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

const buildReportsQueryString = (query?: ListReportsQuery): string => {
  if (!query) return "";
  const params = new URLSearchParams();

  if (query.status) params.set("status", query.status);
  if (query.targetType) params.set("targetType", query.targetType);
  if (query.reporterUserId) params.set("reporterUserId", query.reporterUserId);
  if (query.createdFrom) params.set("createdFrom", query.createdFrom);
  if (query.createdTo) params.set("createdTo", query.createdTo);
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

export const reportsApi = {
  createReport: async (payload: CreateReportRequest): Promise<CreateReportResponse> => {
    return fphgoFetchClient<CreateReportResponse>(routes.v1.reports.create(), {
      method: "POST",
      body: { ...payload },
    });
  },
  listReports: async (query?: ListReportsQuery): Promise<ListReportsResponse> => {
    const path = `${routes.v1.reports.list()}${buildReportsQueryString(query)}`;
    return fphgoFetchClient<ListReportsResponse>(path);
  },
  getReportDetail: async (reportId: string): Promise<GetReportDetailResponse> => {
    return fphgoFetchClient<GetReportDetailResponse>(routes.v1.reports.byId(reportId));
  },
  updateReportStatus: async (reportId: string, payload: UpdateReportStatusRequest): Promise<UpdateReportStatusResponse> => {
    return fphgoFetchClient<UpdateReportStatusResponse>(routes.v1.reports.status(reportId), {
      method: "PATCH",
      body: { ...payload },
    });
  },
  suspendUser: async (appUserId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.users.suspend(appUserId), {
      method: "POST",
      body: { ...payload },
    });
  },
  unsuspendUser: async (appUserId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.users.unsuspend(appUserId), {
      method: "POST",
      body: { ...payload },
    });
  },
  setUserReadOnly: async (appUserId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.users.readOnly(appUserId), {
      method: "POST",
      body: { ...payload },
    });
  },
  clearUserReadOnly: async (appUserId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.users.clearReadOnly(appUserId), {
      method: "POST",
      body: { ...payload },
    });
  },
  hideThread: async (threadId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.chika.threads.hide(threadId), {
      method: "POST",
      body: { ...payload },
    });
  },
  unhideThread: async (threadId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.chika.threads.unhide(threadId), {
      method: "POST",
      body: { ...payload },
    });
  },
  hideComment: async (commentId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.chika.comments.hide(commentId), {
      method: "POST",
      body: { ...payload },
    });
  },
  unhideComment: async (commentId: string, payload: ModerationActionRequest): Promise<ModerationActionResponse> => {
    return fphgoFetchClient<ModerationActionResponse>(routes.v1.moderation.chika.comments.unhide(commentId), {
      method: "POST",
      body: { ...payload },
    });
  },
};
