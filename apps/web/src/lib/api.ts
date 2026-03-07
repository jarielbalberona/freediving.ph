import { apiClient, type ApiClientOptions } from "@/lib/api/client";

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  ok: boolean;
  text(): Promise<string>;
  json(): Promise<T>;
}

export async function apiCall<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<ApiResponse<T>> {
  const data = await apiClient<T>(path, options);
  return {
    status: 200,
    data,
    ok: true,
    text: async () => JSON.stringify(data),
    json: async () => data,
  };
}
