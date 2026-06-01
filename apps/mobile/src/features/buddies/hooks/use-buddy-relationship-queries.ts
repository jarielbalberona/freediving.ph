import {
  getBuddyList,
  getBuddyPreview,
  getIncomingBuddyRequests,
  getOutgoingBuddyRequests,
} from "@/features/buddies/api/buddies-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export const useBuddyListQuery = () =>
  useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getBuddyList(authToken),
    queryKey: mobileQueryKeys.buddies.list(),
    staleTime: 2 * 60 * 1000,
  });

export const useIncomingBuddyRequestsQuery = () =>
  useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getIncomingBuddyRequests(authToken),
    queryKey: mobileQueryKeys.buddies.incomingRequests(),
    staleTime: 2 * 60 * 1000,
  });

export const useOutgoingBuddyRequestsQuery = () =>
  useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getOutgoingBuddyRequests(authToken),
    queryKey: mobileQueryKeys.buddies.outgoingRequests(),
    staleTime: 2 * 60 * 1000,
  });

export const useBuddyPreviewQuery = (
  userId: string | undefined,
  options: { enabled?: boolean } = {},
) =>
  useAuthenticatedFphgoQuery({
    enabled: Boolean(userId) && (options.enabled ?? true),
    queryFn: (_context, authToken) => getBuddyPreview(userId ?? "", authToken),
    queryKey: mobileQueryKeys.buddies.relationshipPreview(userId ?? ""),
    staleTime: 2 * 60 * 1000,
  });
