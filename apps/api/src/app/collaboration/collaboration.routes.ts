import express, { Router } from "express";

import CollaborationController from "@/app/collaboration/collaboration.controller";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/auth";
import { createFeatureRateLimiter } from "@/rateLimiter";

export const collaborationRouter: Router = (() => {
  const router = express.Router();
  const postLimiter = createFeatureRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: "Too many collaboration posts. Please try again later."
  });

  router.get("/", (req, res) => new CollaborationController(req, res).list());
  router.post("/", clerkAuthMiddleware, postLimiter, (req, res) => new CollaborationController(req, res).create());
  router.patch("/:id/moderate", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new CollaborationController(req, res).moderate(),
  );

  return router;
})();
