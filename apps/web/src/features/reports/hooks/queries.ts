import { useQuery } from "@tanstack/react-query";
import type { ListReportsQuery } from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

import { reportsApi } from "../api/reports";

export const useReports = (query?: ListReportsQuery) => {
  return useQuery({
    queryKey: queryKeys.reports.list(
      query as Record<string, unknown> | undefined,
    ),
    queryFn: () => reportsApi.listReports(query),
  });
};

export const useReportDetail = (reportId?: string) => {
  return useQuery({
    queryKey: queryKeys.reports.detail(reportId),
    queryFn: () => reportsApi.getReportDetail(String(reportId)),
    enabled: Boolean(reportId),
  });
};
