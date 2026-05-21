import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { buddiesApi } from "../api/buddies";

export const useIncomingBuddyRequests = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.buddies.incomingRequests(),
    queryFn: buddiesApi.getIncomingRequests,
    enabled,
  });

export const useOutgoingBuddyRequests = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.buddies.outgoingRequests(),
    queryFn: buddiesApi.getOutgoingRequests,
    enabled,
  });

export const useBuddies = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.buddies.list(),
    queryFn: buddiesApi.listBuddies,
    enabled,
  });

export const useBuddyPreview = (userId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.buddies.preview(userId),
    queryFn: () => buddiesApi.preview(userId!),
    enabled: !!userId,
  });
