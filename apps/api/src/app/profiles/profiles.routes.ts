import express, { Router } from "express";

import ProfilesController from "@/app/profiles/profiles.controller";
import { clerkAuthMiddleware } from "@/middlewares/clerk.middleware";

export const profilesRouter: Router = (() => {
  const router = express.Router();

  router.get("/:username", (req, res) => {
    new ProfilesController(req, res).getProfileByUsername();
  });

  router.put("/me", clerkAuthMiddleware, (req, res) => {
    new ProfilesController(req, res).updateOwnProfile();
  });

  router.post("/me/personal-bests", clerkAuthMiddleware, (req, res) => {
    new ProfilesController(req, res).createPersonalBest();
  });

  router.put("/me/personal-bests/:id", clerkAuthMiddleware, (req, res) => {
    new ProfilesController(req, res).updatePersonalBest();
  });

  router.delete("/me/personal-bests/:id", clerkAuthMiddleware, (req, res) => {
    new ProfilesController(req, res).deletePersonalBest();
  });

  return router;
})();
