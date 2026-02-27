import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { hasMinimumGlobalRole, type GlobalRole } from "@freediving.ph/config";

import { createApiQuery } from "@/lib/api/query";

interface MePayload {
  userId: string;
  clerkSubject: string;
  globalRole: GlobalRole;
  accountStatus: "active" | "read_only" | "suspended";
  permissions: string[];
  scopes: {
    group: { groupId: string; role: string } | null;
    event: { eventId: string; role: string } | null;
  };
}

export function useMe(initialData?: MePayload) {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: createApiQuery<MePayload>("/v1/auth/session"),
    retry: false,
    initialData
  });
}

export function usePermissions() {
  const { data } = useMe();
  const permissions = data?.permissions ?? [];
  const role = data?.globalRole;

  return {
    role,
    permissions,
    hasPermission: (permission: string) => permissions.includes(permission),
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
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
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
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
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
      queryClient.setQueryData(["auth", "session"], undefined);
      successCB(data);
    }
  });
}
