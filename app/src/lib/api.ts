import { redirect } from "next/navigation";

export async function appAPICall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // Include cookies
  });

  if (!res.ok) {
    throw new Error(`Error: ${res.status} ${res.statusText}`);
  }
  const { data } = await res.json();
  return data;
}

export async function serverAPICall<T>(
  url: string,
  options: RequestInit = {},
  isAuthPage = false
): Promise<T> {
  const res = await fetch(`${process.env.API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // Include cookies
  });

  if (!res.ok) {
    if (!isAuthPage) {
      if (res.status === 401 || res.status === 403) {
        // redirect("/auth"); // Redirect to login page
      }
    }
  }

  return await res.json();;
}
