import { apiClient, type ApiClientOptions } from "@/lib/api/client";

export const createApiQuery =
  <T>(path: string, options?: ApiClientOptions) =>
  async (): Promise<T> =>
    apiClient<T>(path, options);
