// Legacy API utility - kept for backward compatibility
// New features should use the HTTP client from @/lib/http

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  ok: boolean;
  text(): Promise<string>;
  json(): Promise<any>;
}

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken(): Promise<string | null>;
      };
    };
  }
}

const getBaseUrl = () => {
  const serverUrl = process.env.API_URL;
  const clientUrl = process.env.NEXT_PUBLIC_API_URL;
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // Server-side calls should use explicit API host when provided.
    return serverUrl || clientUrl || 'http://localhost:4000';
  }
  // Browser calls use the public API host.
  return clientUrl || 'http://localhost:4000';
};

export async function apiCall<T>(
  url: string,
  options: RequestInit = {},
  isAuthPage = false
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const endpointUrl = `${baseUrl}${url}`;

  // Get Clerk token if available
  let authToken = '';
  if (typeof window !== 'undefined') {
    try {
      authToken = (await window.Clerk?.session?.getToken()) || '';
    } catch (error) {
      console.log('No Clerk token available');
    }
  }

  const res = await fetch(endpointUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken && { "Authorization": `Bearer ${authToken}` }),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    if (!isAuthPage && (res.status === 401 || res.status === 403)) {
      // Handle auth errors
      console.log("API Error: Handle error");
    }
    console.log(`API Error: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}
