import express, { Router } from "express";

import MessagesController from "@/app/messages/messages.controller";
import { ROUTE_RATE_LIMITS } from "@/core/abuseControls";
import { clerkAuthMiddleware, requirePolicy } from "@/middlewares/auth";
import { createFeatureRateLimiter } from "@/rateLimiter";

export const messagesRouter: Router = (() => {
  const router = express.Router();
  const conversationCreateLimiter = createFeatureRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: ROUTE_RATE_LIMITS.directConversationCreatePerHour,
    message: "Too many conversation creation attempts. Please try again later."
  });
  const messageSendLimiter = createFeatureRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: ROUTE_RATE_LIMITS.messageSendPerHour,
    message: "Too many messages sent. Please slow down."
  });

  router.use(clerkAuthMiddleware);

  router.route("/conversations").get((req, res) => {
    new MessagesController(req, res).listConversations();
  });

  router.route("/conversations/direct").post(conversationCreateLimiter, (req, res) => {
    new MessagesController(req, res).createOrGetDirectConversation();
  });

  router
    .route("/conversations/:conversationId/messages")
    .get((req, res) => {
      new MessagesController(req, res).listMessages();
    })
    .post(messageSendLimiter, (req, res) => {
      new MessagesController(req, res).sendMessage();
    });

  router.delete("/conversations/:conversationId/messages/:messageId", (req, res) => {
    new MessagesController(req, res).deleteOwnMessage();
  });

  router.patch(
    "/conversations/:conversationId/messages/:messageId/moderate-remove",
    requirePolicy("reports.moderate"),
    (req, res) => {
      new MessagesController(req, res).moderateRemoveMessage();
    },
  );

  return router;
})();
