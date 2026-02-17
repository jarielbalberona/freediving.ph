import { Router } from "express";
import db from "@/databases/drizzle/connection";
import { getMetricsSnapshot } from "@/observability/metrics";
import { withTimeout } from "@/utils/resilience";
import { authRouter } from "@/routes/auth.routes";
import { mediaRouter } from "@/app/media/media.routes";
import { diveSpotRouter } from "@/app/diveSpot/diveSpot.routes";
import { userRouter } from "@/app/user/user.routes";
import { threadsRouter } from "@/app/threads/threads.routes";
import { eventsRouter } from "@/app/events/events.routes";
import { groupsRouter } from "@/app/groups/groups.routes";
import { notificationsRouter } from "@/app/notifications/notifications.routes";
import { userServicesRouter } from "@/app/userServices/userServices.routes";
import { messagesRouter } from "@/app/messages/messages.routes";
import { reportsRouter } from "@/app/reports/reports.routes";
import { profilesRouter } from "@/app/profiles/profiles.routes";
import { buddiesRouter } from "@/app/buddies/buddies.routes";
import { competitiveRecordsRouter } from "@/app/competitiveRecords/competitiveRecords.routes";
import { trainingLogsRouter } from "@/app/trainingLogs/trainingLogs.routes";
import { safetyResourcesRouter } from "@/app/safetyResources/safetyResources.routes";
import { awarenessRouter } from "@/app/awareness/awareness.routes";
import { marketplaceRouter } from "@/app/marketplace/marketplace.routes";
import { collaborationRouter } from "@/app/collaboration/collaboration.routes";
import { moderationRouter } from "@/app/moderation/moderation.routes";
import { blocksRouter } from "@/app/blocks/blocks.routes";
import clerkWebhookRouter from "@/routes/clerk-webhook";

import { csrfRouter } from "@/routes/csrf.route";

interface RouteConfig {
  path: string;
  router: Router;
}

const healthRouter = Router();
healthRouter.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ status: "live" });
});
healthRouter.get("/ready", async (_req, res) => {
  try {
    await withTimeout(
      () => db.execute("select 1"),
      2000,
      "Database readiness check timed out"
    );
    res.status(200).json({ status: "ready", checks: { database: "ok" } });
  } catch {
    res.status(503).json({ status: "not_ready", checks: { database: "unavailable" } });
  }
});

const metricsRouter = Router();
metricsRouter.get("/", (_req, res) => {
  res.status(200).json(getMetricsSnapshot());
});

export const routes: RouteConfig[] = [
  { path: "/health", router: healthRouter },
  { path: "/metrics", router: metricsRouter },
  { path: "/media", router: mediaRouter },
  { path: "/auth", router: authRouter },
  { path: "/users", router: userRouter },
  { path: "/csrf-token", router: csrfRouter },
  { path: "/dive-spots", router: diveSpotRouter },
  { path: "/threads", router: threadsRouter },
  { path: "/events", router: eventsRouter },
  { path: "/groups", router: groupsRouter },
  { path: "/notifications", router: notificationsRouter },
  { path: "/messages", router: messagesRouter },
  { path: "/reports", router: reportsRouter },
  { path: "/profiles", router: profilesRouter },
  { path: "/buddies", router: buddiesRouter },
  { path: "/competitive-records", router: competitiveRecordsRouter },
  { path: "/training-logs", router: trainingLogsRouter },
  { path: "/safety-resources", router: safetyResourcesRouter },
  { path: "/awareness", router: awarenessRouter },
  { path: "/marketplace", router: marketplaceRouter },
  { path: "/collaboration", router: collaborationRouter },
  { path: "/user-services", router: userServicesRouter },
  { path: "/moderation", router: moderationRouter },
  { path: "/blocks", router: blocksRouter },
  { path: "/webhooks", router: clerkWebhookRouter },
];
