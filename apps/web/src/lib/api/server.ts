import "server-only";

import { auth } from "@clerk/nextjs/server";

import { apiClient, type ApiClientOptions } from "@/lib/api/client";

export async function apiServerClient<T>(path: string, options: Omit<ApiClientOptions, "token"> = {}) {
  const authState = await auth();
  const token = await authState.getToken();
  return apiClient<T>(path, { ...options, token });
}
