import type { ApiEnvelope, CreateTrainingLogRequest, TrainingLogSession } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

export const trainingLogsApi = {
  list: async (): Promise<TrainingLogSession[]> => {
    const response = await axiosInstance.get<ApiEnvelope<TrainingLogSession[]>>("/training-logs");
    return response.data.data;
  },
  create: async (payload: CreateTrainingLogRequest): Promise<TrainingLogSession> => {
    const response = await axiosInstance.post<ApiEnvelope<TrainingLogSession>>("/training-logs", payload);
    return response.data.data;
  },
};
