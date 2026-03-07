import express, { Router } from "express";
import { eq } from "drizzle-orm";

import db from "@/databases/drizzle/connection";
import ModerationController from "@/app/moderation/moderation.controller";
import { chikaPseudonyms } from "@/models/drizzle/chika.model";
import { users } from "@/models/drizzle/authentication.model";
import { clerkAuthMiddleware, requirePolicy } from "@/middlewares/auth";
import { assertCanRevealIdentity, requireAuth } from "@/middlewares/auth";

export const moderationRouter: Router = (() => {
  const router = express.Router();

  router.post("/chika/identity-reveal", requireAuth, async (req, res) => {
    const threadId = Number(req.body?.threadId);

    if (!Number.isInteger(threadId) || threadId <= 0) {
      res.status(400).json({ status: 400, message: "Invalid threadId" });
      return;
    }

    const reveal = await assertCanRevealIdentity(req, String(threadId));
    if (!reveal.allowed) {
      res.status(403).json({ status: 403, message: "Insufficient permissions" });
      return;
    }

    const rows = await db
      .select({
        pseudonymId: chikaPseudonyms.id,
        threadId: chikaPseudonyms.threadId,
        userId: chikaPseudonyms.userId,
        displayHandle: chikaPseudonyms.displayHandle,
        identity: {
          id: users.id,
          name: users.name,
          username: users.username,
          alias: users.alias,
          email: users.email
        }
      })
      .from(chikaPseudonyms)
      .leftJoin(users, eq(chikaPseudonyms.userId, users.id))
      .where(eq(chikaPseudonyms.threadId, threadId));

    res.status(200).json({
      status: 200,
      message: "Identity reveal successful",
      data: { threadId, items: rows }
    });
  });

  router.use(clerkAuthMiddleware, requirePolicy("reports.moderate"));

  router.patch("/threads/:threadId/lock", (req, res) => {
    new ModerationController(req, res).lockThread();
  });

  router.patch("/threads/:threadId/remove", (req, res) => {
    new ModerationController(req, res).removeThread();
  });

  router.patch("/users/:userId/suspension", (req, res) => {
    new ModerationController(req, res).suspendUser();
  });

  router.patch("/users/:userId/feature-restrictions", (req, res) => {
    new ModerationController(req, res).setUserFeatureRestriction();
  });

  router.get("/threads/:threadId/pseudonyms", (req, res) => {
    new ModerationController(req, res).revealThreadPseudonyms();
  });

  return router;
})();
