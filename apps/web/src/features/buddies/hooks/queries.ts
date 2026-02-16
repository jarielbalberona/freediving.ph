import { useQuery } from "@tanstack/react-query";
import type { BuddyFinderQuery } from "@freediving.ph/types";

import { buddiesApi } from "../api/buddies";

export const useBuddyRequests = () =>
  useQuery({
    queryKey: ["buddies", "requests"],
    queryFn: buddiesApi.getRequests,
  });

export const useActiveBuddies = () =>
  useQuery({
    queryKey: ["buddies", "active"],
    queryFn: buddiesApi.getActiveBuddies,
  });

export const useBuddyFinderSearch = (query: BuddyFinderQuery) =>
  useQuery({
    queryKey: ["buddies", "finder", query],
    queryFn: () => buddiesApi.finderSearch(query),
  });
