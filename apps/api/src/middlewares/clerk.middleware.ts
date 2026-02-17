import type { GlobalRole } from "@freediving.ph/config";

import {
  clerkAuthMiddleware,
  optionalClerkAuthMiddleware,
  requireAnyRole,
  requirePolicy,
  requireRole,
  requireGlobalRole
} from "@/middlewares/auth";

// Compatibility shim for legacy imports. New code should import from @/middlewares/auth.
// Legacy references kept for tests: requirePlatformRole, hasMinimumPlatformRole
export const requirePlatformRole = (role: "member" | "moderator" | "admin") => {
  const roleMap: Record<typeof role, GlobalRole[]> = {
    member: ["member", "trusted_member", "support", "moderator", "explore_curator", "records_verifier", "admin", "super_admin"],
    moderator: ["moderator", "admin", "super_admin"],
    admin: ["admin", "super_admin"]
  };
  return requireGlobalRole(roleMap[role]);
};

export {
  clerkAuthMiddleware,
  optionalClerkAuthMiddleware,
  requireRole,
  requireAnyRole,
  requirePolicy
};
