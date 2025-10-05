import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";

export function useProfile(data: any = {}) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await apiCall<any>("/auth/me");
      return response.data; // specifically return the data property
    },
    initialData: data,
  });
}

interface LoginRequest {
  email: string;
  password: string;
  csrfToken: string;
}

export function useLogin(successCB: any) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiCall("/auth/login", {
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiCall("/auth/register", {
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
export function useLogout(successCB: any) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (csrfToken: any) =>
      apiCall("/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], undefined)
      successCB(data)
    },
    onError: (error: any) => {
      console.error("Logout failed:", error?.message);
    },
  });
}
