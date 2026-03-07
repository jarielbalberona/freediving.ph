import { Router } from "express";

import db from "@/databases/drizzle/connection";
import { optionalAuth, requireAuth } from "@/middlewares/auth";
import { appUsers } from "@/models/drizzle/rbac.model";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/health", optionalAuth, async (req, res) => {
  if (!req.auth) {
    res.status(200).json({
      status: 200,
      message: "No bearer token supplied",
      data: { authenticated: false }
    });
    return;
  }

  const [user] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, req.auth.clerkUserId))
    .limit(1);

  res.status(200).json({
    status: 200,
    message: "Token parsed",
    data: {
      authenticated: true,
      provisioned: Boolean(user),
      clerkUserId: req.auth.clerkUserId
    }
  });
});

router.get("/me", requireAuth, async (req, res) => {
  if (!req.context) {
    res.status(403).json({ status: 403, message: "Missing auth context" });
    return;
  }

  const [user] = await db
    .select({
      id: appUsers.id,
      displayName: appUsers.displayName,
      globalRole: appUsers.globalRole,
      status: appUsers.status,
      trustScore: appUsers.trustScore
    })
    .from(appUsers)
    .where(eq(appUsers.id, req.context.appUserId))
    .limit(1);

  if (!user) {
    res.status(401).json({ status: 401, message: "User not provisioned" });
    return;
  }

  res.status(200).json({
    status: 200,
    message: "User retrieved",
    data: {
      user,
      permissions: req.context.effectivePermissions,
      scopes: {}
    }
  });
});

export { router as authRouter };
