import { useQuery } from "@tanstack/react-query";

import { fphgoHealth } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query/query-keys";

export function useFphgoHealthQuery() {
  return useQuery({
    queryFn: fphgoHealth,
    queryKey: mobileQueryKeys.health.fphgo(),
  });
}
