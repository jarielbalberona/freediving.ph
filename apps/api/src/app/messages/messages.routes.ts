import express, { Router } from "express";

import MessagesController from "@/app/messages/messages.controller";
import { clerkAuthMiddleware, requirePolicy } from "@/middlewares/clerk.middleware";

export const messagesRouter: Router = (() => {
  const router = express.Router();

  router.use(clerkAuthMiddleware);

  router.route("/conversations").get((req, res) => {
    new MessagesController(req, res).listConversations();
  });

  router.route("/conversations/direct").post((req, res) => {
    new MessagesController(req, res).createOrGetDirectConversation();
  });

  router
    .route("/conversations/:conversationId/messages")
    .get((req, res) => {
      new MessagesController(req, res).listMessages();
    })
    .post((req, res) => {
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
