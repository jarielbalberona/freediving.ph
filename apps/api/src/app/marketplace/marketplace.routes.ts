import express, { Router } from "express";

import MarketplaceController from "@/app/marketplace/marketplace.controller";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/auth";
import { createFeatureRateLimiter } from "@/rateLimiter";

export const marketplaceRouter: Router = (() => {
  const router = express.Router();
  const postLimiter = createFeatureRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "Too many listing actions. Please try again later."
  });

  router.get("/", (req, res) => new MarketplaceController(req, res).list());
  router.post("/", clerkAuthMiddleware, postLimiter, (req, res) => new MarketplaceController(req, res).create());
  router.patch("/:id/moderate", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new MarketplaceController(req, res).moderate(),
  );

  return router;
})();
