export interface ApiResponse<T = any> {
  status: number;
  data: T;
  ok: boolean;
  text(): Promise<string>;
  json(): Promise<any>;
}

const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL;
};

export async function apiCall<T>(
  url: string,
  options: RequestInit = {},
  isAuthPage = false
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    if (!isAuthPage && (res.status === 401 || res.status === 403)) {
      // Handle auth errors
    }
    throw new Error(`Error: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}
