// Legacy API utility - kept for backward compatibility
// New features should use the HTTP client from @/lib/http

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  ok: boolean;
  text(): Promise<string>;
  json(): Promise<any>;
}

const getBaseUrl = () => {
  const serverUrl = process.env.API_URL;
  const clientUrl = process.env.NEXT_PUBLIC_API_URL;
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // Use Docker service name for server-side requests
    return serverUrl || 'http://api:4000';
  }
  // Use localhost for client-side requests
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
    // Client-side: get token from Clerk
    try {
      const { getToken } = await import('@clerk/nextjs');
      authToken = await getToken() || '';
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
