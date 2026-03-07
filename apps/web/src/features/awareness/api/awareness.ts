import type { ApiEnvelope, AwarenessPost } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

export const awarenessApi = {
  list: async (): Promise<AwarenessPost[]> => {
    const response = await axiosInstance.get<ApiEnvelope<AwarenessPost[]>>("/awareness");
    return response.data.data;
  },
};
