import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { hasMinimumGlobalRole, type GlobalRole, type PermissionFlag, type PermissionMatrix } from "@freediving.ph/config";

import { apiCall } from "@/lib/api";

interface MeUser {
  id: string;
  displayName: string | null;
  globalRole: GlobalRole;
  status: "active" | "read_only" | "suspended";
  trustScore: number;
}

interface MePayload {
  user: MeUser;
  permissions: PermissionMatrix;
  scopes: Record<string, unknown>;
}

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
}

export function useMe(initialData?: MePayload) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await apiCall<Envelope<MePayload>>("/api/v1/auth/me");
      return response.data.data;
    },
    retry: false,
    initialData
  });
}

export function usePermissions() {
  const { data } = useMe();
  const permissions = data?.permissions;
  const role = data?.user.globalRole;

  return {
    role,
    permissions,
    hasPermission: (permission: PermissionFlag) => Boolean(permissions?.[permission]),
    hasRole: (minimumRole: GlobalRole) => (role ? hasMinimumGlobalRole(role, minimumRole) : false)
  };
}

export function useProfile(data: MePayload | undefined = undefined) {
  return useMe(data);
}

interface LoginRequest {
  email: string;
  password: string;
  csrfToken: string;
}

export function useLogin(successCB: (data: unknown) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_body: LoginRequest) => {
      if (typeof window !== "undefined") {
        window.location.assign("/sign-in");
      }
      return { status: 302, data: null };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      successCB(data);
    }
  });
}

export function useRegister(successCB: (data: unknown) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_body: LoginRequest) => {
      if (typeof window !== "undefined") {
        window.location.assign("/sign-up");
      }
      return { status: 302, data: null };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      successCB(data);
    }
  });
}

export function useLogout(successCB: (data: unknown) => void) {
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  return useMutation({
    mutationFn: async () => {
      await signOut();
      return { status: 200, data: null };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], undefined);
      successCB(data);
    }
  });
}
