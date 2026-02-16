import type { ApiEnvelope } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

import type { CreateReportRequest, ReportItem } from '@freediving.ph/types';

export const reportsApi = {
  createReport: async (payload: CreateReportRequest): Promise<ReportItem> => {
    const response = await axiosInstance.post<ApiEnvelope<ReportItem>>("/reports", payload);
    return response.data.data;
  },
};
