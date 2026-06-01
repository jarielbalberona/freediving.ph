import type {
  GetReportDetailResponse,
  ListReportsQuery,
  ListReportsResponse,
  ReportStatus,
  UpdateReportStatusResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const listModerationReports = (
  query: ListReportsQuery,
  authToken: string,
) =>
  fphgoFetch<ListReportsResponse>(
    withQuery("/v1/reports", {
      cursor: query.cursor,
      limit: query.limit ?? 50,
      reporterUserId: query.reporterUserId,
      status: query.status,
      targetType: query.targetType,
    }),
    { auth: "required", authToken },
  );

export const getModerationReport = (reportId: string, authToken: string) =>
  fphgoFetch<GetReportDetailResponse>(
    `/v1/reports/${encodeURIComponent(reportId)}`,
    { auth: "required", authToken },
  );

export const updateModerationReportStatus = (
  reportId: string,
  status: Exclude<ReportStatus, "open">,
  note: string | undefined,
  authToken: string,
) =>
  fphgoFetch<UpdateReportStatusResponse>(
    `/v1/reports/${encodeURIComponent(reportId)}/status`,
    {
      auth: "required",
      authToken,
      body: { note: note?.trim() || undefined, status },
      method: "PATCH",
    },
  );
