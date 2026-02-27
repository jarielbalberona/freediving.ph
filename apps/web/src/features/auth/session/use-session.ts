"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { hasMinimumGlobalRole, type GlobalRole } from "@freediving.ph/config";

import { apiClient } from "@/lib/api/client";
import { routes } from "@/lib/api/fphgo-routes";

export type MeResponse = {
  userId: string;
  clerkSubject: string;
  globalRole: GlobalRole;
  accountStatus: "active" | "read_only" | "suspended";
  permissions: string[];
  scopes: {
    group: { groupId: string; role: string } | null;
    event: { eventId: string; role: string } | null;
  };
};

export type SessionStatus = "signed_out" | "loading" | "signed_in";

export const SESSION_QUERY_KEY = ["session"] as const;

export type SessionState = {
  status: SessionStatus;
  me: MeResponse | null;
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
    queryFn: () => apiClient<MeResponse>(routes.v1.me()),
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

