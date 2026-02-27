"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { apiClient, ApiClientError } from "@/lib/api/client";

const GLOBAL_ROLE_RANK: Record<string, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};

export type SessionContext = {
  userId: string;
  clerkSubject: string;
  globalRole: "member" | "moderator" | "admin" | "super_admin";
  accountStatus: "active" | "read_only" | "suspended";
  permissions: string[];
  scopes: {
    group: { groupId: string; role: string } | null;
    event: { eventId: string; role: string } | null;
  };
};

export function useAuthSessionContext() {
  const { user, isLoaded } = useUser();

  return useQuery({
    queryKey: ["auth", "session"],
    enabled: isLoaded && !!user,
    retry: false,
    queryFn: () => apiClient<SessionContext>("/v1/auth/session"),
  });
}

export function useAuthGate() {
  const sessionQuery = useAuthSessionContext();
  const session = sessionQuery.data;

  return useMemo(
    () => ({
      session,
      isLoading: sessionQuery.isLoading,
      error: sessionQuery.error,
      can: (permission: string) => Boolean(session?.permissions.includes(permission)),
      roleIsAtLeast: (requiredRole: SessionContext["globalRole"]) => {
        if (!session?.globalRole) {
          return false;
        }
        return GLOBAL_ROLE_RANK[session.globalRole] >= GLOBAL_ROLE_RANK[requiredRole];
      },
      isReadOnly: session?.accountStatus === "read_only",
      isSuspended: session?.accountStatus === "suspended",
    }),
    [session, sessionQuery.error, sessionQuery.isLoading],
  );
}

export function AuthGate() {
  const { user, isLoaded } = useUser();
  const { isReadOnly, isSuspended, error } = useAuthGate();

  if (!isLoaded || !user) {
    return null;
  }
  if (error instanceof ApiClientError && error.status === 401) {
    return null;
  }
  if (isSuspended) {
    return (
      <div className="border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
        Account suspended. Contact support to restore access.
      </div>
    );
  }
  if (isReadOnly) {
    return (
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Account is read-only. Write actions are disabled.
      </div>
    );
  }

  return null;
}
