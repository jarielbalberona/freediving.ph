import express, { Router } from "express";

import CompetitiveRecordsController from "@/app/competitiveRecords/competitiveRecords.controller";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/clerk.middleware";

export const competitiveRecordsRouter: Router = (() => {
  const router = express.Router();

  router.get("/", (req, res) => new CompetitiveRecordsController(req, res).list());
  router.post("/", clerkAuthMiddleware, (req, res) => new CompetitiveRecordsController(req, res).create());
  router.patch("/:id/moderate", clerkAuthMiddleware, requireRole("EDITOR"), (req, res) =>
    new CompetitiveRecordsController(req, res).moderate(),
  );

  return router;
})();
