import { useQuery } from "@tanstack/react-query";
import type { ListReportsQuery } from "@freediving.ph/types";

import { reportsApi } from "../api/reports";

export const useReports = (query?: ListReportsQuery) => {
  return useQuery({
    queryKey: ["reports", "list", query],
    queryFn: () => reportsApi.listReports(query),
  });
};

export const useReportDetail = (reportId?: string) => {
  return useQuery({
    queryKey: ["reports", "detail", reportId],
    queryFn: () => reportsApi.getReportDetail(String(reportId)),
    enabled: Boolean(reportId),
  });
};
