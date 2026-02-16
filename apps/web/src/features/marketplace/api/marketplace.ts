import type { ApiEnvelope, MarketplaceListing } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

export const marketplaceApi = {
  list: async (): Promise<MarketplaceListing[]> => {
    const response = await axiosInstance.get<ApiEnvelope<MarketplaceListing[]>>("/marketplace");
    return response.data.data;
  },
};
