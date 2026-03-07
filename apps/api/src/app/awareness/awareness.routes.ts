import express, { Router } from "express";

import AwarenessController from "@/app/awareness/awareness.controller";
import { clerkAuthMiddleware } from "@/middlewares/auth";
import { createFeatureRateLimiter } from "@/rateLimiter";

export const awarenessRouter: Router = (() => {
  const router = express.Router();
  const postLimiter = createFeatureRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 40,
    message: "Too many awareness posts. Please try again later."
  });

  router.get("/", (req, res) => new AwarenessController(req, res).list());
  router.post("/", clerkAuthMiddleware, postLimiter, (req, res) => new AwarenessController(req, res).create());

  return router;
})();
