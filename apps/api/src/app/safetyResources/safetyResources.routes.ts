import express, { Router } from "express";

import SafetyResourcesController from "@/app/safetyResources/safetyResources.controller";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/auth";

export const safetyResourcesRouter: Router = (() => {
  const router = express.Router();

  router.get("/pages", (req, res) => new SafetyResourcesController(req, res).listPages());
  router.get("/contacts", (req, res) => new SafetyResourcesController(req, res).listContacts());

  router.post("/pages", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new SafetyResourcesController(req, res).createPage(),
  );
  router.put("/pages/:id", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new SafetyResourcesController(req, res).updatePage(),
  );
  router.post("/pages/:id/rollback", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new SafetyResourcesController(req, res).rollbackPage(),
  );
  router.get("/pages/stale", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new SafetyResourcesController(req, res).listStalePages(),
  );
  router.post("/contacts", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new SafetyResourcesController(req, res).createContact(),
  );

  return router;
})();
