import { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { verifyToken } from "@clerk/express";
import {
  getEffectivePermissions,
  hasMinimumEventRole,
  hasMinimumGroupRole,
  resolveScopedPermission,
  type EventRole,
  type GlobalRole,
  type GroupRole,
  type PermissionFlag,
  type PermissionMatrix,
  type PermissionOverrides
} from "@freediving.ph/config";

import db from "@/databases/drizzle/connection";
import { writeAuditLog } from "@/core/audit";
import { users as legacyUsers } from "@/models/drizzle/authentication.model";
import {
  appUsers,
  eventMemberships,
  groupMemberships,
  userPermissionOverrides
} from "@/models/drizzle/rbac.model";
import { ApiResponse } from "@/utils/serviceApi";

type AuthPayload = {
  sub: string;
  email?: string;
};

interface AuthenticatedContext {
  clerkUserId: string;
  appUserId: string;
  email: string | null;
  globalRole: GlobalRole;
  status: "active" | "read_only" | "suspended";
  overrides: PermissionOverrides;
  effectivePermissions: PermissionMatrix;
}

type LegacyPolicyAction = "reports.read" | "reports.moderate" | "reports.create";
const LEGACY_POLICY_TO_PERMISSION: Record<LegacyPolicyAction, PermissionFlag> = {
  "reports.create": "reports.create",
  "reports.read": "reports.review",
  "reports.moderate": "reports.review"
};

const LEGACY_ROLE_TO_GLOBAL_ROLES: Record<string, GlobalRole[]> = {
  SUPER_ADMIN: ["super_admin"],
  ADMINISTRATOR: ["admin", "super_admin"],
  EDITOR: ["moderator", "admin", "super_admin"],
  USER: ["member", "trusted_member", "support", "moderator", "explore_curator", "records_verifier", "admin", "super_admin"]
};

declare global {
  namespace Express {
    interface Request {
      user?: any;
      requestId?: string;
      auth?: {
        clerkUserId: string;
        email: string | null;
      };
      context?: AuthenticatedContext;
      scope?: {
        group?: {
          groupId: number;
          groupRole: GroupRole;
        };
        event?: {
          eventId: number;
          eventRole: EventRole;
        };
      };
    }
  }
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
};

const getClientIp = (req: Request): string | null => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0];
  }

  return req.ip ?? null;
};

const verifyBearerToken = async (token: string): Promise<AuthPayload> => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY");
  }

  const payload = await verifyToken(token, { secretKey });
  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined
  };
};

const getAppUserByClerkId = async (clerkUserId: string) => {
  const [user] = await db
    .select({
      id: appUsers.id,
      clerkUserId: appUsers.clerkUserId,
      email: appUsers.email,
      globalRole: appUsers.globalRole,
      status: appUsers.status,
      suspensionUntil: appUsers.suspensionUntil
    })
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, clerkUserId))
    .limit(1);

  if (!user) {
    return null;
  }

  const [overrideRecord] = await db
    .select({ overrides: userPermissionOverrides.overrides })
    .from(userPermissionOverrides)
    .where(eq(userPermissionOverrides.userId, user.id))
    .limit(1);

  const overrides = (overrideRecord?.overrides as PermissionOverrides | undefined) ?? {};

  return {
    ...user,
    overrides,
    effectivePermissions: getEffectivePermissions(user.globalRole, overrides)
  };
};

const isSuspended = (suspensionUntil: Date | null): boolean => {
  if (!suspensionUntil) {
    return true;
  }

  return suspensionUntil.getTime() > Date.now();
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiResponse = new ApiResponse(res);
  const token = getBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = await verifyBearerToken(token);
    req.auth = {
      clerkUserId: payload.sub,
      email: payload.email ?? null
    };

    next();
  } catch {
    apiResponse.unauthorizedResponse("Invalid token");
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiResponse = new ApiResponse(res);
  const token = getBearerToken(req);

  if (!token) {
    apiResponse.unauthorizedResponse("Missing bearer token");
    return;
  }

  try {
    const payload = await verifyBearerToken(token);
    const appUser = await getAppUserByClerkId(payload.sub);

    if (!appUser) {
      apiResponse.unauthorizedResponse("User not provisioned");
      return;
    }

    if (appUser.status === "suspended" && isSuspended(appUser.suspensionUntil)) {
      apiResponse.forbiddenResponse("Account suspended");
      return;
    }

    req.auth = {
      clerkUserId: payload.sub,
      email: payload.email ?? appUser.email ?? null
    };

    req.context = {
      clerkUserId: payload.sub,
      appUserId: appUser.id,
      email: payload.email ?? appUser.email ?? null,
      globalRole: appUser.globalRole,
      status: appUser.status,
      overrides: appUser.overrides,
      effectivePermissions: appUser.effectivePermissions
    };

    const [legacyUser] = await db
      .select()
      .from(legacyUsers)
      .where(eq(legacyUsers.clerkId, payload.sub))
      .limit(1);

    if (legacyUser) {
      req.user = legacyUser;
    }

    next();
  } catch {
    apiResponse.unauthorizedResponse("Invalid token");
  }
};

export const clerkAuthMiddleware = requireAuth;
export const optionalClerkAuthMiddleware = optionalAuth;

export const requireRole = (legacyRole: string) => {
  const mappedRoles = LEGACY_ROLE_TO_GLOBAL_ROLES[legacyRole.toUpperCase()] ?? ["super_admin"];
  return requireGlobalRole(mappedRoles);
};

export const requireAnyRole = (legacyRoles: string[]) => {
  const mapped = new Set<GlobalRole>();
  for (const role of legacyRoles) {
    const roleMap = LEGACY_ROLE_TO_GLOBAL_ROLES[role.toUpperCase()] ?? [];
    for (const item of roleMap) {
      mapped.add(item);
    }
  }
  return requireGlobalRole(Array.from(mapped));
};

export const requirePolicy = (action: LegacyPolicyAction) =>
  requirePermission(LEGACY_POLICY_TO_PERMISSION[action]);

export const requirePermission = (permission: PermissionFlag) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiResponse = new ApiResponse(res);

    if (!req.context) {
      apiResponse.forbiddenResponse("Missing auth context");
      return;
    }

    if (req.context.status === "read_only" && WRITE_METHODS.has(req.method.toUpperCase())) {
      apiResponse.forbiddenResponse("Account is read-only");
      return;
    }

    const allowed = resolveScopedPermission(permission, {
      globalRole: req.context.globalRole,
      groupRole: req.scope?.group?.groupRole,
      eventRole: req.scope?.event?.eventRole,
      overrides: req.context.overrides
    });

    if (!allowed) {
      apiResponse.forbiddenResponse("Insufficient permissions");
      return;
    }

    next();
  };
};

export const requireGlobalRole = (roles: GlobalRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiResponse = new ApiResponse(res);

    if (!req.context) {
      apiResponse.forbiddenResponse("Missing auth context");
      return;
    }

    if (!roles.includes(req.context.globalRole)) {
      apiResponse.forbiddenResponse("Insufficient role");
      return;
    }

    next();
  };
};

export const requireGroupRole = (minRole: GroupRole) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiResponse = new ApiResponse(res);

    if (!req.context) {
      apiResponse.forbiddenResponse("Missing auth context");
      return;
    }

    const groupId = Number(req.params.groupId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      apiResponse.badResponse("Invalid groupId");
      return;
    }

    const [membership] = await db
      .select({ role: groupMemberships.role })
      .from(groupMemberships)
      .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, req.context.appUserId)))
      .limit(1);

    const role = membership?.role ?? null;
    if (!role || !hasMinimumGroupRole(role, minRole)) {
      apiResponse.forbiddenResponse("Insufficient group role");
      return;
    }

    req.scope = {
      ...req.scope,
      group: {
        groupId,
        groupRole: role
      }
    };

    next();
  };
};

export const requireEventRole = (minRole: EventRole) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiResponse = new ApiResponse(res);

    if (!req.context) {
      apiResponse.forbiddenResponse("Missing auth context");
      return;
    }

    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      apiResponse.badResponse("Invalid eventId");
      return;
    }

    const [membership] = await db
      .select({ role: eventMemberships.role })
      .from(eventMemberships)
      .where(and(eq(eventMemberships.eventId, eventId), eq(eventMemberships.userId, req.context.appUserId)))
      .limit(1);

    const role = membership?.role ?? null;
    if (!role || !hasMinimumEventRole(role, minRole)) {
      apiResponse.forbiddenResponse("Insufficient event role");
      return;
    }

    req.scope = {
      ...req.scope,
      event: {
        eventId,
        eventRole: role
      }
    };

    next();
  };
};

export const assertCanRevealIdentity = async (
  req: Request,
  entityId: string
): Promise<{ allowed: boolean }> => {
  const hasPermission = Boolean(req.context?.effectivePermissions["chika.reveal_identity"]);
  const actorUserId = req.context?.appUserId ?? null;
  const ip = getClientIp(req);

  await writeAuditLog({
    actorUserId,
    action: hasPermission ? "CHIKA_IDENTITY_REVEAL_ALLOWED" : "CHIKA_IDENTITY_REVEAL_DENIED",
    entityType: "thread",
    entityId,
    metadata: {
      requestId: req.requestId ?? null,
      ip,
      allowed: hasPermission
    }
  });

  return { allowed: hasPermission };
};
