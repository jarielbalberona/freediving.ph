import { useQuery } from "@tanstack/react-query";

import { buddiesApi } from "../api/buddies";

export const useIncomingBuddyRequests = () =>
  useQuery({
    queryKey: ["buddies", "requests", "incoming"],
    queryFn: buddiesApi.getIncomingRequests,
  });

export const useOutgoingBuddyRequests = () =>
  useQuery({
    queryKey: ["buddies", "requests", "outgoing"],
    queryFn: buddiesApi.getOutgoingRequests,
  });

export const useBuddies = () =>
  useQuery({
    queryKey: ["buddies", "list"],
    queryFn: buddiesApi.listBuddies,
  });

export const useBuddyPreview = (userId: string | undefined) =>
  useQuery({
    queryKey: ["buddies", "preview", userId],
    queryFn: () => buddiesApi.preview(userId!),
    enabled: !!userId,
  });
