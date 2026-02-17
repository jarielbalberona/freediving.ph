import express, { Router } from "express";

import BuddiesController from "@/app/buddies/buddies.controller";
import { ROUTE_RATE_LIMITS } from "@/core/abuseControls";
import { clerkAuthMiddleware } from "@/middlewares/clerk.middleware";
import { createFeatureRateLimiter } from "@/rateLimiter";

export const buddiesRouter: Router = (() => {
  const router = express.Router();
  const requestLimiter = createFeatureRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: ROUTE_RATE_LIMITS.buddyActionsPerHour,
    message: "Too many buddy actions. Please try again later."
  });
  const finderLimiter = createFeatureRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: ROUTE_RATE_LIMITS.buddyFinderPer15Minutes,
    message: "Too many finder queries. Please try again later."
  });

  router.use(clerkAuthMiddleware);

  router.post("/requests", requestLimiter, (req, res) => new BuddiesController(req, res).sendRequest());
  router.get("/requests", (req, res) => new BuddiesController(req, res).listRequests());
  router.post("/requests/:requestId/accept", (req, res) => new BuddiesController(req, res).acceptRequest());
  router.post("/requests/:requestId/reject", (req, res) => new BuddiesController(req, res).rejectRequest());
  router.post("/requests/:requestId/cancel", (req, res) => new BuddiesController(req, res).cancelRequest());

  router.get("/", (req, res) => new BuddiesController(req, res).listBuddies());
  router.delete("/:buddyUserId", (req, res) => new BuddiesController(req, res).removeBuddy());

  router.get("/finder/search", finderLimiter, (req, res) => new BuddiesController(req, res).finder());

  return router;
})();
