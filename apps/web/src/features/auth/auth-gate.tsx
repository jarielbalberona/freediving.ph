"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";

import { useSession } from "@/features/auth/session";

const GLOBAL_ROLE_RANK: Record<string, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};

export function useAuthGate() {
  const session = useSession();

  return useMemo(
    () => ({
      session: session.me,
      isLoading: session.status === "loading",
      error: null,
      can: (permission: string) => Boolean(session.permissions.includes(permission)),
      roleIsAtLeast: (requiredRole: "member" | "moderator" | "admin" | "super_admin") => {
        if (!session.me?.globalRole) {
          return false;
        }
        return GLOBAL_ROLE_RANK[session.me.globalRole] >= GLOBAL_ROLE_RANK[requiredRole];
      },
      isReadOnly: session.me?.accountStatus === "read_only",
      isSuspended: session.me?.accountStatus === "suspended",
    }),
    [session],
  );
}

export function AuthGate() {
  const { user, isLoaded } = useUser();
  const { isReadOnly, isSuspended } = useAuthGate();

  if (!isLoaded || !user) {
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
