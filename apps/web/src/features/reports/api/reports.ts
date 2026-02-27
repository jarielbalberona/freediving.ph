import type { CreateReportRequest, CreateReportResponse } from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch";
import { routes } from "@/lib/api/fphgo-routes";

export const reportsApi = {
  createReport: async (payload: CreateReportRequest): Promise<CreateReportResponse> => {
    return fphgoFetchClient<CreateReportResponse>(routes.v1.reports.create(), {
      method: "POST",
      body: { ...payload },
    });
  },
};
