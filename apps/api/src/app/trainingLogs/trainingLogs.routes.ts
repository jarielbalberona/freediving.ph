import express, { Router } from "express";

import TrainingLogsController from "@/app/trainingLogs/trainingLogs.controller";
import { clerkAuthMiddleware } from "@/middlewares/clerk.middleware";

export const trainingLogsRouter: Router = (() => {
  const router = express.Router();

  router.use(clerkAuthMiddleware);

  router.get("/", (req, res) => new TrainingLogsController(req, res).list());
  router.post("/", (req, res) => new TrainingLogsController(req, res).create());
  router.patch("/:id", (req, res) => new TrainingLogsController(req, res).updateSession());
  router.delete("/:id", (req, res) => new TrainingLogsController(req, res).deleteSession());
  router.get("/:id/metrics", (req, res) => new TrainingLogsController(req, res).listMetrics());
  router.put("/:id/metrics", (req, res) => new TrainingLogsController(req, res).upsertMetric());

  return router;
})();
