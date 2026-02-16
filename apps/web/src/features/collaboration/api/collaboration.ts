import type { ApiEnvelope, CollaborationPost } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

export const collaborationApi = {
  list: async (): Promise<CollaborationPost[]> => {
    const response = await axiosInstance.get<ApiEnvelope<CollaborationPost[]>>("/collaboration");
    return response.data.data;
  },
};
