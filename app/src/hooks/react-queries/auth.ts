import { useQuery, useMutation } from "@tanstack/react-query";
import { appAPICall } from "@/lib/api";
import { queryClient } from "@/lib/react-query";

export async function useProfilePrefetch(cookie: any) {
    await queryClient.prefetchQuery({
    queryKey: ["profile"],
    queryFn: () =>
      appAPICall("/auth/me", {
        headers: { Cookie: cookie },
      }),
  });

}
export function useProfile(data: any = {}) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => appAPICall("/auth/me"),
    initialData: data,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

interface LoginRequest {
  email: string;
  password: string;
  csrfToken: string;
}

export function useLogin(successCB: any) {
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      appAPICall("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "x-csrf-token": body.csrfToken },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      successCB(data)
    },
    onError: (error: any) => {
      console.error("Login failed:", error?.message);
    },
  });
}

export function useRegister(successCB: any) {
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      appAPICall("/auth/resgister", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "x-csrf-token": body.csrfToken },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      successCB(data)
    },
    onError: (error: any) => {
      console.error("Register failed:", error?.message);
    },
  });
}
