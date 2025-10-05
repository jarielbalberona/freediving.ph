import { Router } from "express";
import { authRouter } from "@/routes/auth.routes";
import { mediaRouter } from "@/app/media/media.routes";
import { diveSpotRouter } from "@/app/diveSpot/diveSpot.routes";
import { userRouter } from "@/app/user/user.routes";
import { threadsRouter } from "@/app/threads/threads.routes";
import { eventsRouter } from "@/app/events/events.routes";
import { groupsRouter } from "@/app/groups/groups.routes";
import { notificationsRouter } from "@/app/notifications/notifications.routes";
import { userServicesRouter } from "@/app/userServices/userServices.routes";
import clerkWebhookRouter from "@/routes/clerk-webhook";

import { csrfRouter } from "@/routes/csrf.route";

interface RouteConfig {
  path: string;
  router: Router;
}

const healthRouter = Router();
healthRouter.get("/", (req, res) => {
  res.status(200).send("ok");
});

export const routes: RouteConfig[] = [
  { path: "/health", router: healthRouter },
  { path: "/media", router: mediaRouter },
  { path: "/auth", router: authRouter },
  { path: "/users", router: userRouter },
  { path: "/csrf-token", router: csrfRouter },
  { path: "/dive-spots", router: diveSpotRouter },
  { path: "/threads", router: threadsRouter },
  { path: "/events", router: eventsRouter },
  { path: "/groups", router: groupsRouter },
  { path: "/notifications", router: notificationsRouter },
  { path: "/user-services", router: userServicesRouter },
  { path: "/webhooks", router: clerkWebhookRouter },
];
