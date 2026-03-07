import type { ApiEnvelope, CompetitiveRecord, CompetitiveRecordFilters, CreateCompetitiveRecordRequest } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

export const competitiveRecordsApi = {
  list: async (): Promise<CompetitiveRecord[]> => {
    const response = await axiosInstance.get<ApiEnvelope<CompetitiveRecord[]>>("/competitive-records");
    return response.data.data;
  },
  listWithFilters: async (filters: CompetitiveRecordFilters): Promise<CompetitiveRecord[]> => {
    const response = await axiosInstance.get<ApiEnvelope<CompetitiveRecord[]>>("/competitive-records", {
      params: filters,
    });
    return response.data.data;
  },
  create: async (payload: CreateCompetitiveRecordRequest): Promise<CompetitiveRecord> => {
    const response = await axiosInstance.post<ApiEnvelope<CompetitiveRecord>>("/competitive-records", payload);
    return response.data.data;
  },
};
