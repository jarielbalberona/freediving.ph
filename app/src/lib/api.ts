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

  console.log({
    isServer,
    serverUrl,
    clientUrl,
    finalUrl: isServer ? serverUrl : clientUrl
  });

  if (isServer) {
    return serverUrl || 'http://localhost:4000';
  }
  return clientUrl || 'http://localhost:4000';
};

export async function apiCall<T>(
  url: string,
  options: RequestInit = {},
  isAuthPage = false
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const endpointUrl = `${baseUrl}${url}`
  console.log("endpointUrl", endpointUrl);
  const res = await fetch(endpointUrl, {
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
      console.log("API Error: Handle error");
    }
    console.log(`API Error: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}
