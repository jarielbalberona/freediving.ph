import { useQuery } from "@tanstack/react-query";

import { marketplaceApi } from "../api/marketplace";

export const useMarketplaceListings = () =>
  useQuery({
    queryKey: ["marketplace"],
    queryFn: marketplaceApi.list,
  });
