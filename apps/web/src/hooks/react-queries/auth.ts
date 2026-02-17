import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_body: LoginRequest) => {
      if (typeof window !== "undefined") {
        window.location.assign("/sign-in");
      }
      return { status: 302, data: null };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      successCB(data);
    },
    onError: (error: any) => {
      console.error("Login failed:", error?.message);
    },
  });
}

export function useRegister(successCB: any) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_body: LoginRequest) => {
      if (typeof window !== "undefined") {
        window.location.assign("/sign-up");
      }
      return { status: 302, data: null };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      successCB(data);
    },
    onError: (error: any) => {
      console.error("Register failed:", error?.message);
    },
  });
}
export function useLogout(successCB: any) {
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  return useMutation({
    mutationFn: async () => {
      await signOut();
      return { status: 200, data: null };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], undefined);
      successCB(data);
    },
    onError: (error: any) => {
      console.error("Logout failed:", error?.message);
    },
  });
}
