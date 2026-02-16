import { useMutation } from "@tanstack/react-query";

import { reportsApi } from "../api/reports";
import type { CreateReportRequest } from '@freediving.ph/types';

export const useCreateReport = () => {
  return useMutation({
    mutationFn: (payload: CreateReportRequest) => reportsApi.createReport(payload),
  });
};
