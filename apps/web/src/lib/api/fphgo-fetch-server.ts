import "server-only";

import {
  createFphgoFetcher,
  type FphgoFetchInit,
} from "@/lib/api/fphgo-fetch-client";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

const getClerkTokenFromServer = async (): Promise<string | null> => {
  const { auth } = await import("@clerk/nextjs/server");
  const authState = await auth();
  return authState.getToken();
};

const serverFetcher = createFphgoFetcher({
  baseUrlProvider: getFphgoBaseUrlServer,
  tokenProvider: getClerkTokenFromServer,
});

export const fphgoFetchServer = <T>(path: string, init?: FphgoFetchInit) =>
  serverFetcher<T>(path, init);

export type { FphgoFetchInit } from "@/lib/api/fphgo-fetch-client";
