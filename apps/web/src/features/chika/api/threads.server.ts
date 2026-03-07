import "server-only";

import type {
  ChikaCategoryListResponse,
  ChikaCategoryResponse,
  ChikaThreadListResponse,
  ChikaThreadResponse,
} from "@freediving.ph/types";

import { fphgoFetchServer } from "@/lib/api/fphgo-fetch-server";
import { routes } from "@/lib/api/fphgo-routes";

/**
 * Server-side threads API. Use in Server Components to fetch with Clerk auth.
 * Uses auth().getToken() so requests include the user's session.
 */
export const threadsApiServer = {
  getAll: async (category?: string): Promise<ChikaThreadResponse[]> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fphgoFetchServer<ChikaThreadListResponse>(
      `${routes.v1.chika.threads.list()}${query}`,
    );
    return response?.items ?? [];
  },

  getCategories: async (): Promise<ChikaCategoryResponse[]> => {
    const response = await fphgoFetchServer<ChikaCategoryListResponse>(
      routes.v1.chika.categories(),
    );
    return response?.items ?? [];
  },
};
