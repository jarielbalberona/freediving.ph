import type { ApiEnvelope, BuddyFinderQuery, BuddyRequestListResponse, BuddyUserCard } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

export const buddiesApi = {
  getRequests: async (): Promise<BuddyRequestListResponse> => {
    const response = await axiosInstance.get<ApiEnvelope<BuddyRequestListResponse>>("/buddies/requests");
    return response.data.data;
  },

  sendRequest: async (toUserId: number) => {
    const response = await axiosInstance.post<ApiEnvelope<unknown>>("/buddies/requests", { toUserId });
    return response.data.data;
  },

  acceptRequest: async (requestId: number) => {
    const response = await axiosInstance.post<ApiEnvelope<unknown>>(`/buddies/requests/${requestId}/accept`);
    return response.data.data;
  },

  rejectRequest: async (requestId: number, reason?: string) => {
    const response = await axiosInstance.post<ApiEnvelope<unknown>>(`/buddies/requests/${requestId}/reject`, { reason });
    return response.data.data;
  },

  getActiveBuddies: async (): Promise<BuddyUserCard[]> => {
    const response = await axiosInstance.get<ApiEnvelope<BuddyUserCard[]>>("/buddies");
    return response.data.data;
  },

  removeBuddy: async (buddyUserId: number) => {
    const response = await axiosInstance.delete<ApiEnvelope<unknown>>(`/buddies/${buddyUserId}`);
    return response.data.data;
  },

  finderSearch: async (query: BuddyFinderQuery): Promise<BuddyUserCard[]> => {
    const response = await axiosInstance.get<ApiEnvelope<BuddyUserCard[]>>("/buddies/finder/search", { params: query });
    return response.data.data;
  },
};
