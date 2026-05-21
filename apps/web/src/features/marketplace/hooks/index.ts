import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { marketplaceApi } from "../api/marketplace";

export const useMarketplaceListings = () =>
  useQuery({
    queryKey: queryKeys.marketplace.list(),
    queryFn: marketplaceApi.list,
  });
