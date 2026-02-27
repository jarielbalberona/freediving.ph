"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { hasMinimumGlobalRole, type GlobalRole } from "@freediving.ph/config";
import type { MeResponse as SharedMeResponse } from "@freediving.ph/types";

import { apiClient } from "@/lib/api/client";
import { routes } from "@/lib/api/fphgo-routes";

export type SessionStatus = "signed_out" | "loading" | "signed_in";
export type { MeResponse } from "@freediving.ph/types";

export const SESSION_QUERY_KEY = ["session"] as const;

export type SessionState = {
  status: SessionStatus;
  me: SharedMeResponse | null;
  permissions: string[];
  roles: GlobalRole[];
  hasPermission: (permission: string) => boolean;
  hasRole: (minimumRole: GlobalRole) => boolean;
};

export function useSession(): SessionState {
  const { isLoaded, isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    enabled: isLoaded && Boolean(isSignedIn),
    retry: false,
    queryFn: () => apiClient<SharedMeResponse>(routes.v1.me()),
  });

  if (!isLoaded) {
    return {
      status: "loading",
      me: null,
      permissions: [],
      roles: [],
      hasPermission: () => false,
      hasRole: () => false,
    };
  }

  if (!isSignedIn) {
    return {
      status: "signed_out",
      me: null,
      permissions: [],
      roles: [],
      hasPermission: () => false,
      hasRole: () => false,
    };
  }

  if (query.isPending || !query.data) {
    return {
      status: "loading",
      me: null,
      permissions: [],
      roles: [],
      hasPermission: () => false,
      hasRole: () => false,
    };
  }

  const permissions = query.data.permissions ?? [];
  const role = query.data.globalRole;
  return {
    status: "signed_in",
    me: query.data,
    permissions,
    roles: role ? [role] : [],
    hasPermission: (permission: string) => permissions.includes(permission),
    hasRole: (minimumRole: GlobalRole) =>
      role ? hasMinimumGlobalRole(role, minimumRole) : false,
  };
}
