import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { hasMinimumGlobalRole, type GlobalRole } from "@freediving.ph/config";

import {
  SESSION_QUERY_KEY,
  useSession,
  type MeResponse as SessionMeResponse,
} from "@/features/auth/session";

type MePayload = SessionMeResponse;

export function useMe(initialData?: MePayload) {
  const session = useSession();
  return {
    data: session.me ?? initialData,
    isLoading: session.status === "loading",
    error: null,
  };
}

export function usePermissions() {
  const session = useSession();
  const permissions = session.permissions;
  const role = session.me?.globalRole;

  return {
    role,
    permissions,
    status: session.status,
    hasPermission: session.hasPermission,
    hasRole: (minimumRole: GlobalRole) =>
      role ? hasMinimumGlobalRole(role, minimumRole) : false
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
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
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
      queryClient.setQueryData(SESSION_QUERY_KEY, undefined);
      successCB(data);
    }
  });
}
