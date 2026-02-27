import type {
  BuddyListResponse,
  BuddyPreviewResponse,
  BuddyRequest,
  IncomingBuddyRequestsResponse,
  OutgoingBuddyRequestsResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch";
import { routes } from "@/lib/api/fphgo-routes";

type BuddyRequestResponse = {
  request: BuddyRequest;
};

export const buddiesApi = {
  getIncomingRequests: async (): Promise<IncomingBuddyRequestsResponse> => {
    return fphgoFetchClient<IncomingBuddyRequestsResponse>(routes.v1.buddies.incomingRequests());
  },

  getOutgoingRequests: async (): Promise<OutgoingBuddyRequestsResponse> => {
    return fphgoFetchClient<OutgoingBuddyRequestsResponse>(routes.v1.buddies.outgoingRequests());
  },

  sendRequest: async (targetUserId: string): Promise<BuddyRequestResponse> => {
    return fphgoFetchClient<BuddyRequestResponse>(routes.v1.buddies.createRequest(), {
      method: "POST",
      body: { targetUserId },
    });
  },

  acceptRequest: async (requestId: string): Promise<BuddyRequestResponse> => {
    return fphgoFetchClient<BuddyRequestResponse>(routes.v1.buddies.acceptRequest(requestId), {
      method: "POST",
    });
  },

  declineRequest: async (requestId: string): Promise<BuddyRequestResponse> => {
    return fphgoFetchClient<BuddyRequestResponse>(routes.v1.buddies.declineRequest(requestId), {
      method: "POST",
    });
  },

  cancelRequest: async (requestId: string): Promise<BuddyRequestResponse> => {
    return fphgoFetchClient<BuddyRequestResponse>(routes.v1.buddies.cancelRequest(requestId), {
      method: "DELETE",
    });
  },

  listBuddies: async (): Promise<BuddyListResponse> => {
    return fphgoFetchClient<BuddyListResponse>(routes.v1.buddies.list());
  },

  removeBuddy: async (buddyUserId: string): Promise<void> => {
    await fphgoFetchClient<void>(routes.v1.buddies.byUserId(buddyUserId), {
      method: "DELETE",
    });
  },

  preview: async (userId: string): Promise<BuddyPreviewResponse> => {
    return fphgoFetchClient<BuddyPreviewResponse>(routes.v1.buddies.preview(userId));
  },
};
