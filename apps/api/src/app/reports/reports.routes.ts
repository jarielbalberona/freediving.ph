import express, { Router } from "express";

import ReportsController from "@/app/reports/reports.controller";
import { clerkAuthMiddleware, requirePolicy } from "@/middlewares/clerk.middleware";

export const reportsRouter: Router = (() => {
  const router = express.Router();

  router.post("/", clerkAuthMiddleware, requirePolicy("reports.create"), (req, res) => {
    new ReportsController(req, res).createReport();
  });

  router.get("/", clerkAuthMiddleware, requirePolicy("reports.read"), (req, res) => {
    new ReportsController(req, res).listReports();
  });

  router.patch(
    "/:id/status",
    clerkAuthMiddleware,
    requirePolicy("reports.moderate"),
    (req, res) => {
      new ReportsController(req, res).updateReportStatus();
    },
  );

  return router;
})();
