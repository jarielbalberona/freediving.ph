import express, { Router } from "express";

import MessagesController from "@/app/messages/messages.controller";
import { clerkAuthMiddleware } from "@/middlewares/clerk.middleware";

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

  return router;
})();
