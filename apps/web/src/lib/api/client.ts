import {
  FphgoFetchError,
  fphgoFetchClient,
  getAuthToken,
  type FphgoFetchInit,
} from "@/lib/api/fphgo-fetch";
import { getFphgoBaseUrlClient } from "@/lib/api/fphgo-base-url";

export type ApiClientOptions = FphgoFetchInit;

export class ApiClientError extends FphgoFetchError {}

export const getApiBaseUrl = () => getFphgoBaseUrlClient();

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  try {
    return await fphgoFetchClient<T>(path, options);
  } catch (error) {
    if (error instanceof FphgoFetchError) {
      throw new ApiClientError({
        status: error.status,
        body: error.body,
        message: error.message,
      });
    }
    throw error;
  }
}

export { getAuthToken };

