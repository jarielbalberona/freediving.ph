import { useQuery } from "@tanstack/react-query";

import { buddiesApi } from "../api/buddies";

export const useIncomingBuddyRequests = (enabled = true) =>
  useQuery({
    queryKey: ["buddies", "requests", "incoming"],
    queryFn: buddiesApi.getIncomingRequests,
    enabled,
  });

export const useOutgoingBuddyRequests = (enabled = true) =>
  useQuery({
    queryKey: ["buddies", "requests", "outgoing"],
    queryFn: buddiesApi.getOutgoingRequests,
    enabled,
  });

export const useBuddies = (enabled = true) =>
  useQuery({
    queryKey: ["buddies", "list"],
    queryFn: buddiesApi.listBuddies,
    enabled,
  });

export const useBuddyPreview = (userId: string | undefined) =>
  useQuery({
    queryKey: ["buddies", "preview", userId],
    queryFn: () => buddiesApi.preview(userId!),
    enabled: !!userId,
  });
