import "server-only";

import { fphgoFetchServer, type FphgoFetchInit } from "@/lib/api/fphgo-fetch";

export async function apiServerClient<T>(
  path: string,
  options: Omit<FphgoFetchInit, "token"> = {},
) {
  return fphgoFetchServer<T>(path, options);
}
